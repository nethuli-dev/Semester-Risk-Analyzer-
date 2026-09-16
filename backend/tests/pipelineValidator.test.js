const { validatePipeline } = require('../src/services/pipelineValidator');

const userId = 'user-123';

describe('pipelineValidator: one passing case per allowed stage', () => {
  test('$match', () => {
    const result = validatePipeline([{ $match: { category: 'Midterm' } }], { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(true);
  });

  test('$group', () => {
    const result = validatePipeline(
      [{ $group: { _id: '$courseId', avgScore: { $avg: '$score' } } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(true);
  });

  test('$project', () => {
    const result = validatePipeline(
      [{ $project: { title: 1, score: 1, percent: { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] } } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(true);
  });

  test('$sort', () => {
    const result = validatePipeline([{ $sort: { date: -1 } }], { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(true);
  });

  test('$limit', () => {
    const result = validatePipeline([{ $limit: 5 }], { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(true);
  });

  test('$addFields', () => {
    const result = validatePipeline(
      [{ $addFields: { percent: { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] } } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(true);
  });

  test('$unwind', () => {
    const result = validatePipeline([{ $unwind: '$gradingScheme' }], { collection: 'courses', userId });
    expect(result.valid).toBe(true);
  });

  test('$count', () => {
    const result = validatePipeline([{ $count: 'totalEntries' }], { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(true);
  });

  test('$bucket', () => {
    const result = validatePipeline(
      [{ $bucket: { groupBy: '$score', boundaries: [0, 50, 100], default: 'other' } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(true);
  });
});

describe('pipelineValidator: field shape evolves through the pipeline', () => {
  test('a $sort after $group can reference the group stage\'s own computed output field', () => {
    // Real bug caught by live testing against Gemini: "which course has my
    // lowest average score?" generates $group (introducing a computed
    // "averagePercent" field) followed by $sort on that same field — this
    // must NOT be rejected as an "unknown field" just because
    // averagePercent isn't in gradeEntries' original schema.
    const result = validatePipeline(
      [
        { $group: { _id: '$courseId', averagePercent: { $avg: { $divide: ['$score', '$maxScore'] } } } },
        { $sort: { averagePercent: 1 } },
        { $limit: 1 },
      ],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(true);
  });

  test('a field introduced by $group is NOT retroactively valid for a stage before it', () => {
    const result = validatePipeline(
      [
        { $sort: { averagePercent: 1 } },
        { $group: { _id: '$courseId', averagePercent: { $avg: '$score' } } },
      ],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Unknown field "averagePercent"/);
  });

  test('$project computed field name becomes referenceable in a later $sort', () => {
    const result = validatePipeline(
      [
        { $project: { percent: { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] } } },
        { $sort: { percent: -1 } },
      ],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(true);
  });
});

describe('pipelineValidator: malicious/invalid pipelines rejected for the right reason', () => {
  test('rejects $out (data exfiltration / write to another collection)', () => {
    const result = validatePipeline(
      [{ $match: { userId: 'someone-else' } }, { $out: 'stolen_data' }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/disallowed stage "\$out"/);
  });

  test('rejects $merge (write into another collection)', () => {
    const result = validatePipeline([{ $merge: { into: 'gradeEntries_backup' } }], { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/disallowed stage "\$merge"/);
  });

  test('rejects $where (arbitrary JS execution) even nested inside an allowed stage', () => {
    const result = validatePipeline(
      [{ $match: { $where: 'this.score > 0; while(true){}' } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/\$where/);
  });

  test('rejects $function (arbitrary JS execution) nested inside a $project expression', () => {
    const result = validatePipeline(
      [{ $project: { hacked: { $function: { body: 'function() { return db.users.find(); }', args: [], lang: 'js' } } } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/\$function/);
  });

  test('rejects a pipeline referencing a field that does not exist in the schema', () => {
    const result = validatePipeline(
      [{ $match: { isAdmin: true } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Unknown field "isAdmin"/);
  });

  test('rejects an unknown/unrecognized expression operator (fail-closed allowlist)', () => {
    const result = validatePipeline(
      [{ $project: { x: { $unknownOperator: '$score' } } }],
      { collection: 'gradeEntries', userId }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Unknown or disallowed operator "\$unknownOperator"/);
  });

  test('rejects an oversized pipeline', () => {
    const stages = Array.from({ length: 20 }, () => ({ $limit: 1 }));
    const result = validatePipeline(stages, { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/exceeding the limit/);
  });

  test('rejects an excessively deeply nested pipeline', () => {
    let deep = '$score';
    for (let i = 0; i < 10; i += 1) {
      deep = { $add: [deep, 1] };
    }
    const result = validatePipeline([{ $project: { x: deep } }], { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/depth limit/);
  });

  test('rejects a non-array pipeline', () => {
    const result = validatePipeline({ $match: {} }, { collection: 'gradeEntries', userId });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/non-empty array/);
  });
});

describe('pipelineValidator: forced user scoping (the core security guarantee)', () => {
  test('a pipeline with NO self-scoping still gets the real userId forced in as stage 0, and the omission is flagged', () => {
    const result = validatePipeline([{ $match: { category: 'Midterm' } }], { collection: 'gradeEntries', userId });

    expect(result.valid).toBe(true);
    expect(result.pipeline[0]).toEqual({ $match: { userId } });
    expect(result.scopingWarning).toMatch(/did not self-scope/);
  });

  test("a pipeline that tries to scope to a DIFFERENT user's id is still forced onto the real caller — the LLM's attempt never wins", () => {
    const maliciousPipeline = [{ $match: { userId: 'attacker-supplied-victim-id' } }, { $limit: 100 }];

    const result = validatePipeline(maliciousPipeline, { collection: 'gradeEntries', userId });

    expect(result.valid).toBe(true);
    // The validator's own forced stage 0 uses the REAL authenticated user,
    // not whatever the LLM put in its own (now second) $match stage.
    expect(result.pipeline[0]).toEqual({ $match: { userId } });
    // The LLM's own attempt is left in place as stage 1 — harmless, since
    // stage 0 already restricts the result set to the real caller only.
    expect(result.pipeline[1]).toEqual({ $match: { userId: 'attacker-supplied-victim-id' } });
    // It DID self-scope (just to the wrong id), so no warning is expected here.
    expect(result.scopingWarning).toBeNull();
  });
});
