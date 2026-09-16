const { GoogleGenAI } = require('@google/genai');
const { SCHEMA_MAP } = require('./pipelineValidator');
const { ALLOWED_PIPELINE_STAGES } = require('../config/constants');

const MODEL = 'gemini-3.5-flash-lite';

// Lazily constructed so a missing GEMINI_API_KEY only breaks the one
// request that needs it, not the whole app at boot.
let client;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// Structured-output schema: forces the model to return exactly this shape
// (no prose, no markdown fences) rather than hoping it follows instructions.
// This is a convenience for getting clean JSON back, not a security
// boundary — the pipeline's actual structure/fields/stages are re-checked
// from scratch by pipelineValidator regardless of what shape came back here.
//
// `pipeline` is a JSON-encoded STRING, not a typed array/object. A first
// attempt using a real nested schema (`pipeline: {type: 'array', items:
// {type: 'object'}}`) consistently came back as `[{}]` — an object schema
// with no declared `properties` gives Gemini's grammar-constrained decoder
// no valid property names to emit, so every stage came back empty
// regardless of prompting. A plain string field isn't constrained that
// way, so the model can freely write real MongoDB syntax into it — we
// parse that JSON ourselves afterward.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    collection: { type: 'string', enum: Object.keys(SCHEMA_MAP) },
    pipeline: {
      type: 'string',
      description: 'A JSON-encoded array of MongoDB aggregation pipeline stages, e.g. "[{\\"$match\\":{\\"category\\":\\"Midterm\\"}}]"',
    },
  },
  required: ['collection', 'pipeline'],
};

function describeSchema() {
  return Object.entries(SCHEMA_MAP)
    .map(([name, { fields }]) => `- ${name}: ${fields.filter((f) => f !== 'userId').join(', ')}`)
    .join('\n');
}

// A plain "type: object" JSON Schema can't meaningfully constrain a Mongo
// aggregation stage's shape (its keys are semantically dynamic — a $group
// stage's output names are chosen by whoever writes it), and Gemini's
// structured-output mode only supports a JSON Schema subset with no
// pattern-based typing anyway. Concrete worked examples do the real work
// of teaching the model actual pipeline syntax — this is exactly what
// build-instructions §6 calls "few-shot examples," not optional polish.
// The first attempt at this generator (no examples, schema-only) came back
// with `pipeline: [{}]` — a syntactically valid but empty, useless stage.
const FEW_SHOT_EXAMPLES = `Example 1
Question: "What's my average score on assignments?"
Response: {"collection":"gradeEntries","pipeline":"[{\\"$match\\":{\\"category\\":\\"Assignments\\"}},{\\"$group\\":{\\"_id\\":\\"$category\\",\\"averagePercent\\":{\\"$avg\\":{\\"$multiply\\":[{\\"$divide\\":[\\"$score\\",\\"$maxScore\\"]},100]}}}}]"}

Example 2
Question: "What's my attendance rate this term?"
Response: {"collection":"attendanceRecords","pipeline":"[{\\"$group\\":{\\"_id\\":\\"$status\\",\\"count\\":{\\"$sum\\":1}}}]"}

Example 3
Question: "Show me my 5 most recent grade entries"
Response: {"collection":"gradeEntries","pipeline":"[{\\"$sort\\":{\\"date\\":-1}},{\\"$limit\\":5}]"}`;

// The schema map here is the SAME one pipelineValidator.js validates
// against (imported from that module, not duplicated) — so the model is
// never told about a field the validator wouldn't also recognize, and
// there's exactly one place that defines "what fields exist."
function buildSystemInstruction() {
  return `You translate a student's plain-English question about their own academic data into a single MongoDB aggregation pipeline.

Rules:
- Pick exactly ONE target collection from the list below — cross-collection joins are not supported; rephrase the question against a single collection if it seems to need more than one.
- Only use these pipeline stages: ${ALLOWED_PIPELINE_STAGES.join(', ')}.
- Never use $out, $merge, $function, $accumulator, $where, $lookup, or any stage/operator not in that list.
- Only reference fields that exist in the target collection's schema below. Do not invent fields.
- A pipeline stage is never an empty object — every stage does something.
- Respond with only the JSON object the response schema describes — no prose, no markdown.

Collections and their fields (userId is handled automatically — never reference it):
${describeSchema()}

${FEW_SHOT_EXAMPLES}`;
}

// Calls Gemini once and returns its raw, unvalidated { collection, pipeline }
// guess. `feedback`, when present, is the validator's exact rejection
// reason from the previous attempt — this is the one permitted
// regeneration, capped by QUERY_MAX_RETRIES in the controller, never an
// unbounded retry loop. `courseName`, when present, tells the model which
// course the question is about (the actual courseId scoping is enforced
// separately, server-side, by the validator).
async function generatePipeline({ question, feedback, courseName }) {
  const context = courseName ? ` (about the course "${courseName}")` : '';
  const userPrompt = feedback
    ? `Question: "${question}"${context}\n\nYour previous pipeline was rejected for this reason: ${feedback}\nGenerate a corrected pipeline that fixes this specific problem.`
    : `Question: "${question}"${context}`;

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: buildSystemInstruction(),
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  let outer;
  try {
    outer = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini returned invalid JSON: ${err.message}`);
  }

  let pipeline;
  try {
    pipeline = JSON.parse(outer.pipeline);
  } catch (err) {
    throw new Error(`Gemini's pipeline field was not valid JSON: ${err.message}`);
  }

  return { collection: outer.collection, pipeline };
}

const SUMMARY_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    chartType: { type: 'string', enum: ['bar', 'line', 'scatter', 'donut', 'none'] },
  },
  required: ['answer', 'chartType'],
};

// A second, separate LLM call/prompt from generatePipeline — kept
// distinct per PROJECT_PLAN §4 rather than conflating "write a pipeline"
// and "explain this result" into one prompt. This call only ever sees the
// query result and the question, never generates anything that reaches
// the database.
async function summarizeResult({ question, result }) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `Question: "${question}"\nQuery result (JSON array): ${JSON.stringify(result).slice(0, 4000)}`,
    config: {
      systemInstruction: `You answer a student's question about their own academic data in plain English, given the result of a database query that already ran.

Rules:
- Answer directly in 2-4 sentences, citing the actual numbers in the result.
- If the result is empty, say so plainly — do not guess or make up data.
- Also choose the best chart type for this result: "bar", "line", "scatter", "donut", or "none" if a chart wouldn't add value (e.g. the result is a single number).
- Respond with only the JSON object the response schema describes — no prose, no markdown.`,
      responseMimeType: 'application/json',
      responseJsonSchema: SUMMARY_RESPONSE_SCHEMA,
      temperature: 0,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response for the result summary');
  }
  return JSON.parse(text);
}

module.exports = { generatePipeline, summarizeResult };
