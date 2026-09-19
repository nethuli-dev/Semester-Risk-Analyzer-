const request = require('supertest');
const { connectTestDb, disconnectTestDb } = require('./testDb');

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '30d';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

const app = require('../src/app');

beforeAll(async () => {
  await connectTestDb();
}, 60000);
afterAll(disconnectTestDb, 30000);

test('risk history gains a point only when the score changes', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'History Tester', email: 'history@example.com', password: 'correct-horse-battery-staple' });
  const auth = { Authorization: `Bearer ${reg.body.accessToken}` };

  const course = (
    await request(app)
      .post('/api/courses')
      .set(auth)
      .send({
        courseName: 'Physics',
        courseCode: 'PHY101',
        term: 'Fall 2026',
        credits: 3,
        gradingScheme: [{ category: 'Homework', weight: 100 }],
      })
  ).body;

  const history = async () => (await request(app).get(`/api/risk/${course._id}/history`).set(auth)).body;
  const grade = (score) =>
    request(app)
      .post(`/api/courses/${course._id}/grades`)
      .set(auth)
      .send({ category: 'Homework', title: `HW ${score}`, score, maxScore: 100, date: '2026-09-01' });

  await grade(60);
  await request(app).get('/api/risk').set(auth);
  await request(app).get('/api/risk').set(auth);
  await request(app).get('/api/risk').set(auth);
  expect(await history()).toHaveLength(1); // three identical reads, one point

  await grade(90); // average moves 60 -> 75
  await request(app).get('/api/risk').set(auth);
  expect(await history()).toHaveLength(2);
}, 60000); // ~10 sequential round trips to a remote DB, plus bcrypt on register
