const {
  ALLOWED_PIPELINE_STAGES,
  DANGEROUS_EXPRESSION_OPERATORS,
  ALLOWED_EXPRESSION_OPERATORS,
  ALLOWED_SYSTEM_VARIABLES,
  MAX_PIPELINE_STAGES,
  MAX_PIPELINE_DEPTH,
  QUERY_TIMEOUT_MS,
} = require('../config/constants');

// The hardcoded source of truth for what fields exist per collection. The
// LLM's own idea of the schema is never trusted — every field reference
// anywhere in a generated pipeline is checked against this map, and an
// unknown field is rejected rather than silently passed through to Mongo.
const SCHEMA_MAP = {
  courses: {
    fields: ['_id', 'userId', 'courseName', 'courseCode', 'term', 'credits', 'gradingScheme', 'targetGrade', 'createdAt'],
  },
  gradeEntries: {
    fields: ['_id', 'userId', 'courseId', 'category', 'title', 'score', 'maxScore', 'date', 'createdAt'],
  },
  attendanceRecords: {
    fields: ['_id', 'userId', 'courseId', 'date', 'status', 'createdAt'],
  },
  riskAssessments: {
    fields: ['_id', 'userId', 'courseId', 'computedAt', 'riskScore', 'riskLevel', 'factors', 'recommendation'],
  },
};

class PipelineValidationError extends Error {}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Depth of the most deeply nested object/array in the structure — a crude
// but effective guard against a pathologically nested adversarial pipeline
// (whether malicious or just a runaway LLM generation).
function computeDepth(node) {
  if (Array.isArray(node)) {
    return node.length === 0 ? 1 : 1 + Math.max(...node.map(computeDepth));
  }
  if (isPlainObject(node)) {
    const values = Object.values(node);
    return values.length === 0 ? 1 : 1 + Math.max(...values.map(computeDepth));
  }
  return 0;
}

// Recursively scans every value in the structure for dangerous operators,
// regardless of how deeply nested — the stage whitelist alone wouldn't
// catch e.g. $function nested inside a $project's expression.
function findDangerousOperator(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findDangerousOperator(item);
      if (found) return found;
    }
    return null;
  }
  if (isPlainObject(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (DANGEROUS_EXPRESSION_OPERATORS.includes(key)) return key;
      const found = findDangerousOperator(value);
      if (found) return found;
    }
  }
  return null;
}

// `knownFields` is not just the target collection's schema — it's the set
// of fields that actually exist AT THIS POINT in the pipeline. A $group or
// $project reshapes the document, so a later $sort/$match referencing a
// field that $group just computed (e.g. sorting by an $avg accumulator's
// output name) is legitimate even though that name isn't in SCHEMA_MAP.
// Each stage's own field references are checked against the set as it
// stood BEFORE that stage; computeFieldsAfterStage() below grows it for
// stages that introduce new names, so later stages can reference them.
function isKnownField(knownFields, fieldPath) {
  const topLevelSegment = fieldPath.split('.')[0];
  return knownFields.has(topLevelSegment);
}

// Validates a "$fieldName" or "$fieldName.nested" reference string.
// "$$NOW" etc. are system variables, not document fields, and are allowed
// only from a fixed known set (fail-closed, same principle as operators).
function validateFieldReferenceString(value, knownFields) {
  if (value.startsWith('$$')) {
    if (!ALLOWED_SYSTEM_VARIABLES.includes(value)) {
      throw new PipelineValidationError(`Unknown system variable "${value}"`);
    }
    return;
  }
  const fieldPath = value.slice(1);
  if (!isKnownField(knownFields, fieldPath)) {
    throw new PipelineValidationError(`Unknown field "${fieldPath}"`);
  }
}

// Walks an aggregation *expression* (the kind of value that appears inside
// $group accumulators, $project/$addFields computed fields, $unwind paths,
// etc.) — every $-prefixed string is a field reference to validate; every
// $-prefixed object key is an operator that must be on the allowlist.
function validateExpression(node, knownFields) {
  if (typeof node === 'string') {
    if (node.startsWith('$')) {
      validateFieldReferenceString(node, knownFields);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => validateExpression(item, knownFields));
    return;
  }
  if (isPlainObject(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) {
        if (!ALLOWED_EXPRESSION_OPERATORS.includes(key)) {
          throw new PipelineValidationError(`Unknown or disallowed operator "${key}"`);
        }
      }
      validateExpression(value, knownFields);
    }
  }
}

// Walks a $match-style query spec — unlike an expression, a non-$-prefixed
// key here IS a field reference to an existing document field (it's what
// you're filtering ON), not a new/output field name.
function validateMatchSpec(node, knownFields) {
  if (!isPlainObject(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$expr') {
      validateExpression(value, knownFields);
    } else if (key === '$and' || key === '$or' || key === '$nor') {
      (Array.isArray(value) ? value : []).forEach((clause) => validateMatchSpec(clause, knownFields));
    } else if (key.startsWith('$')) {
      if (!ALLOWED_EXPRESSION_OPERATORS.includes(key)) {
        throw new PipelineValidationError(`Unknown or disallowed operator "${key}"`);
      }
      validateExpression(value, knownFields);
    } else {
      if (!isKnownField(knownFields, key)) {
        throw new PipelineValidationError(`Unknown field "${key}"`);
      }
      validateExpression(value, knownFields);
    }
  }
}

// $project/$addFields: a key is an *output* field name — it may be new,
// so it's never validated against the schema. A key set to a literal
// 1/0/true/false in $project is the one exception: that syntax means
// "include/exclude this existing field," so the key itself must exist.
function validateProjectionSpec(node, knownFields, { isProject }) {
  if (!isPlainObject(node)) return;
  for (const [key, value] of Object.entries(node)) {
    const isInclusionExclusionFlag = isProject && (value === 1 || value === 0 || value === true || value === false);
    if (isInclusionExclusionFlag) {
      if (!isKnownField(knownFields, key)) {
        throw new PipelineValidationError(`Unknown field "${key}"`);
      }
    } else {
      validateExpression(value, knownFields);
    }
  }
}

function validateStage(stageKey, stageValue, knownFields) {
  switch (stageKey) {
    case '$match':
      validateMatchSpec(stageValue, knownFields);
      break;
    case '$sort':
      if (isPlainObject(stageValue)) {
        for (const key of Object.keys(stageValue)) {
          if (!isKnownField(knownFields, key)) {
            throw new PipelineValidationError(`Unknown field "${key}"`);
          }
        }
      }
      break;
    case '$project':
      validateProjectionSpec(stageValue, knownFields, { isProject: true });
      break;
    case '$addFields':
      validateProjectionSpec(stageValue, knownFields, { isProject: false });
      break;
    case '$group':
      if (isPlainObject(stageValue)) {
        for (const value of Object.values(stageValue)) {
          validateExpression(value, knownFields);
        }
      }
      break;
    case '$unwind': {
      const path = typeof stageValue === 'string' ? stageValue : stageValue?.path;
      if (typeof path === 'string') validateFieldReferenceString(path, knownFields);
      break;
    }
    case '$bucket':
      if (isPlainObject(stageValue)) {
        if (stageValue.groupBy !== undefined) validateExpression(stageValue.groupBy, knownFields);
        if (stageValue.output !== undefined) {
          for (const value of Object.values(stageValue.output)) validateExpression(value, knownFields);
        }
      }
      break;
    case '$limit':
    case '$count':
      // $limit takes a number; $count takes a new output-field-name
      // string. Neither references an existing field.
      break;
    default:
      break;
  }
}

// Returns the field set a LATER stage may reference. Stages that reshape
// the document ($group, $project, $addFields, $bucket) introduce new
// names; every other stage leaves the shape unchanged. This is
// deliberately additive-only (never removes a name $project excluded) —
// a slight over-permission, not a security gap: the worst case is a
// well-formed pipeline that Mongo itself returns no/null results for, not
// unauthorized data exposure.
function computeFieldsAfterStage(stageKey, stageValue, knownFields) {
  if (!isPlainObject(stageValue)) return knownFields;
  if (stageKey === '$group') {
    return new Set([...knownFields, ...Object.keys(stageValue)]);
  }
  if (stageKey === '$project' || stageKey === '$addFields') {
    return new Set([...knownFields, ...Object.keys(stageValue)]);
  }
  if (stageKey === '$bucket') {
    const outputKeys = isPlainObject(stageValue.output) ? Object.keys(stageValue.output) : [];
    return new Set([...knownFields, '_id', 'count', ...outputKeys]);
  }
  return knownFields;
}

// Did the LLM's own pipeline scope itself to the caller on its own, before
// the validator overwrites/prepends the authoritative $match? This is
// never trusted as the actual security boundary, but it's useful signal —
// build-instructions §6 explicitly asks that a missing/wrong self-scoping
// attempt be logged, not silently ignored.
function hadOwnUserScoping(pipeline) {
  const first = pipeline[0];
  if (!isPlainObject(first) || !isPlainObject(first.$match)) return false;
  return Object.prototype.hasOwnProperty.call(first.$match, 'userId');
}

// The single entry point. Returns { valid: true, pipeline, scopingWarning }
// on success, or { valid: false, reason } on rejection — the controller
// uses `reason` as feedback for the one permitted regeneration attempt.
//
// `pipeline` on success is NOT the LLM's pipeline as generated — it is
// that pipeline with an authoritative {$match: {userId}} PREPENDED by this
// function. The LLM's output is never the sole guarantee of data
// isolation, no matter how well-scoped it looks.
function validatePipeline(rawPipeline, { collection, userId, courseId }) {
  if (!SCHEMA_MAP[collection]) {
    return { valid: false, reason: `Unknown target collection "${collection}"` };
  }
  if (!Array.isArray(rawPipeline) || rawPipeline.length === 0) {
    return { valid: false, reason: 'Pipeline must be a non-empty array of stages' };
  }
  if (rawPipeline.length > MAX_PIPELINE_STAGES) {
    return { valid: false, reason: `Pipeline has ${rawPipeline.length} stages, exceeding the limit of ${MAX_PIPELINE_STAGES}` };
  }
  if (computeDepth(rawPipeline) > MAX_PIPELINE_DEPTH) {
    return { valid: false, reason: `Pipeline nesting exceeds the depth limit of ${MAX_PIPELINE_DEPTH}` };
  }

  const dangerousOp = findDangerousOperator(rawPipeline);
  if (dangerousOp) {
    return { valid: false, reason: `Pipeline uses a disallowed operator "${dangerousOp}"` };
  }

  let knownFields = new Set(SCHEMA_MAP[collection].fields);

  for (let i = 0; i < rawPipeline.length; i += 1) {
    const stage = rawPipeline[i];
    if (!isPlainObject(stage) || Object.keys(stage).length !== 1) {
      return { valid: false, reason: `Stage ${i} must be an object with exactly one stage operator` };
    }
    const [stageKey] = Object.keys(stage);
    if (!ALLOWED_PIPELINE_STAGES.includes(stageKey)) {
      return { valid: false, reason: `Stage ${i} uses disallowed stage "${stageKey}"` };
    }
    try {
      validateStage(stageKey, stage[stageKey], knownFields);
    } catch (err) {
      if (err instanceof PipelineValidationError) {
        return { valid: false, reason: `Stage ${i} (${stageKey}): ${err.message}` };
      }
      throw err;
    }
    knownFields = computeFieldsAfterStage(stageKey, stage[stageKey], knownFields);
  }

  const scopingWarning = hadOwnUserScoping(rawPipeline)
    ? null
    : 'Generated pipeline did not self-scope to userId in its first stage (validator-enforced scoping was applied regardless)';

  // courseId scoping isn't a security boundary the way userId is (the
  // course itself was already verified to belong to this user before we
  // got here) — it's forced in anyway for correctness, so a question
  // asked in the context of one course can't accidentally aggregate
  // across the student's other courses too.
  const forcedMatchSpec = { userId };
  if (courseId && SCHEMA_MAP[collection].fields.includes('courseId')) {
    forcedMatchSpec.courseId = courseId;
  }
  const forcedMatch = { $match: forcedMatchSpec };

  return { valid: true, pipeline: [forcedMatch, ...rawPipeline], scopingWarning };
}

// The read-only guarantee isn't "we checked the pipeline doesn't call
// .updateMany()" — it's that this function, the only path from a
// validated pipeline to the database, has no other capability to reach
// for. It takes a Mongoose Model and a pipeline and can do exactly one
// thing with them.
async function executePipeline(Model, pipeline) {
  return Model.aggregate(pipeline).option({ maxTimeMS: QUERY_TIMEOUT_MS });
}

module.exports = { validatePipeline, executePipeline, SCHEMA_MAP };
