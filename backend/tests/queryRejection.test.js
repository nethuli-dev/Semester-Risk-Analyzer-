const request = require('supertest');
const { connectTestDb, disconnectTestDb } = require('./testDb');

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '30d';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

// The LLM is mocked so these tests prove what the SERVER does with hostile
// model output, independent of how well any real model behaves.
jest.mock('../src/services/pipelineGenerator');
const { generatePipeline, summarizeResult } = require('../src/services/pipelineGenerator');
const GradeEntry = require('../src/models/GradeEntry');
const Query = require('../src/models/Query');
const app = require('../src/app');

let auth;
beforeAll(async () => {
  await connectTestDb();
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Rejection Tester', email: 'reject@example.com', password: 'correct-horse-battery-staple' });
  auth = { Authorization: `Bearer ${reg.body.accessToken}` };
}, 60000);
afterAll(disconnectTestDb, 30000);
beforeEach(() => jest.resetAllMocks());

const ask = (question) => request(app).post('/api/query').set(auth).send({ question });

test('a model refusal returns 422 with the reason, and nothing is executed or retried', async () => {
  generatePipeline.mockResolvedValue({ collection: 'gradeEntries', pipeline: [], refusal: 'I cannot process requests to delete data.' });

  const res = await ask('Delete all of my grades');

  expect(res.status).toBe(422);
  expect(res.body.error).toMatch(/read-only/i);
  expect(res.body.error).toMatch(/cannot process requests to delete data/);
  expect(generatePipeline).toHaveBeenCalledTimes(1); // a refusal is not retried
  expect(summarizeResult).not.toHaveBeenCalled(); // never reached execution
  const stored = await Query.findOne({ question: 'Delete all of my grades' });
  expect(stored.validationStatus).toBe('failed');
});

test.each([
  ['$out stage', [{ $match: { userId: 'someone-else' } }, { $out: 'stolen' }], /\$out/],
  ['unknown field', [{ $match: { passwordHash: 'x' } }], /passwordHash/],
  ['$lookup into another collection', [{ $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } }], /\$lookup/],
])('a model that emits a malicious pipeline (%s) is rejected by the validator and never executed', async (_label, pipeline, reason) => {
  generatePipeline.mockResolvedValue({ collection: 'gradeEntries', pipeline, refusal: '' });
  const countBefore = await GradeEntry.countDocuments();

  const res = await ask(`malicious attempt: ${_label}`);

  expect(res.status).toBe(422);
  expect(res.body.error).toMatch(reason);
  expect(generatePipeline).toHaveBeenCalledTimes(2); // first try + the single allowed retry
  expect(summarizeResult).not.toHaveBeenCalled(); // execution never happened
  expect(await GradeEntry.countDocuments()).toBe(countBefore);
});
