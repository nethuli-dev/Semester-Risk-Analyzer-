// Shows the pipeline validator's verdict on hand-written hostile pipelines —
// the "LLM went rogue" case, with no LLM involved. Run: npm run demo:validator
const { validatePipeline } = require('../src/services/pipelineValidator');

const userId = 'the-signed-in-student';
const cases = [
  ['Steals via $out', 'gradeEntries', [{ $match: { userId: 'someone-else' } }, { $out: 'stolen_data' }]],
  ['Writes via $merge', 'gradeEntries', [{ $merge: { into: 'gradeEntries_backup' } }]],
  ['Joins to users via $lookup', 'gradeEntries', [{ $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } }]],
  ['Reads an unknown field', 'gradeEntries', [{ $match: { passwordHash: { $exists: true } } }]],
  ['Runs code via $function', 'gradeEntries', [{ $project: { x: { $function: { body: 'function(){return 1}', args: [], lang: 'js' } } } }]],
  ['Targets a different user (should be overridden, not rejected)', 'gradeEntries', [{ $match: { userId: 'victim' } }, { $limit: 3 }]],
  ['A normal, safe question', 'gradeEntries', [{ $group: { _id: '$category', avg: { $avg: '$score' } } }]],
];

for (const [label, collection, pipeline] of cases) {
  const result = validatePipeline(pipeline, { collection, userId });
  console.log(`\n${label}\n  input:   ${JSON.stringify(pipeline)}`);
  if (result.valid) {
    console.log(`  verdict: ACCEPTED, and the server made stage 0 ${JSON.stringify(result.pipeline[0])}`);
  } else {
    console.log(`  verdict: REJECTED. ${result.reason}`);
  }
}
