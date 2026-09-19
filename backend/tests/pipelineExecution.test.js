const mongoose = require('mongoose');
const GradeEntry = require('../src/models/GradeEntry');
const { validatePipeline, executePipeline } = require('../src/services/pipelineValidator');
const { connectTestDb, disconnectTestDb } = require('./testDb');

// Regression for a bug the pure-function validator tests could not catch:
// .aggregate() does not cast strings to ObjectId (unlike find()), so a
// forced {$match: {userId: "<string>"}} matched nothing and Ask AI told real
// students "you have no grades recorded". Needs a real DB, hence this file.
describe('pipeline execution against a real collection', () => {
  const userId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await connectTestDb();
    await GradeEntry.create([
      { userId, courseId, category: 'Midterm', title: 'M1', score: 45, maxScore: 100, date: new Date() },
      { userId: new mongoose.Types.ObjectId(), courseId, category: 'Midterm', title: 'someone else', score: 99, maxScore: 100, date: new Date() },
    ]);
  });
  afterAll(disconnectTestDb);

  const pipeline = [{ $group: { _id: '$category', avg: { $avg: '$score' } } }];

  test('ObjectId userId returns only that user\'s rows', async () => {
    const { pipeline: safe } = validatePipeline(pipeline, { collection: 'gradeEntries', userId });
    const result = await executePipeline(GradeEntry, safe);
    expect(result).toEqual([{ _id: 'Midterm', avg: 45 }]);
  });

  test('a string userId silently matches nothing (why the controller must cast)', async () => {
    const { pipeline: unsafe } = validatePipeline(pipeline, { collection: 'gradeEntries', userId: userId.toString() });
    const result = await executePipeline(GradeEntry, unsafe);
    expect(result).toEqual([]);
  });
});
