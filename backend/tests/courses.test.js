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

afterAll(async () => {
  await disconnectTestDb();
}, 30000);

async function registerUser(email) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test Student',
    email,
    password: 'correct-horse-battery-staple',
  });
  return res.body.accessToken;
}

function validCoursePayload(overrides = {}) {
  return {
    courseName: 'Calculus II',
    courseCode: 'MATH201',
    term: 'Fall 2026',
    credits: 4,
    gradingScheme: [
      { category: 'Midterm', weight: 30 },
      { category: 'Final', weight: 40 },
      { category: 'Assignments', weight: 30 },
    ],
    ...overrides,
  };
}

describe('course CRUD', () => {
  let token;

  beforeAll(async () => {
    token = await registerUser('course-owner@example.com');
  });

  test('rejects a grading scheme whose weights do not sum to 100', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(validCoursePayload({ gradingScheme: [{ category: 'Midterm', weight: 50 }] }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sum to 100/i);
  });

  test('create -> read -> update -> delete a course', async () => {
    const createRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(validCoursePayload());
    expect(createRes.status).toBe(201);
    const courseId = createRes.body._id;

    const listRes = await request(app).get('/api/courses').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((c) => c._id === courseId)).toBe(true);

    const updateRes = await request(app)
      .put(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetGrade: 85 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.targetGrade).toBe(85);

    const deleteRes = await request(app)
      .delete(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const afterDeleteRes = await request(app)
      .put(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetGrade: 90 });
    expect(afterDeleteRes.status).toBe(404);
  });
});

describe('grade entry CRUD', () => {
  let token;
  let courseId;

  beforeAll(async () => {
    token = await registerUser('grade-owner@example.com');
    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(validCoursePayload());
    courseId = courseRes.body._id;
  });

  test('create -> read -> update -> delete a grade entry', async () => {
    const createRes = await request(app)
      .post(`/api/courses/${courseId}/grades`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Assignments', title: 'HW1', score: 8, maxScore: 10, date: '2026-09-01' });
    expect(createRes.status).toBe(201);
    const gradeId = createRes.body._id;

    const listRes = await request(app)
      .get(`/api/courses/${courseId}/grades`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((g) => g._id === gradeId)).toBe(true);

    const updateRes = await request(app)
      .put(`/api/grades/${gradeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ score: 9 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.score).toBe(9);

    const deleteRes = await request(app)
      .delete(`/api/grades/${gradeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);
  });

  test('CSV import reports per-row success/failure instead of failing the whole batch', async () => {
    const csv = [
      'category,title,score,maxScore,date',
      'Quiz,Quiz 1,9,10,2026-09-05',
      'Quiz,Quiz 2,not-a-number,10,2026-09-12', // bad score
      'Quiz,Quiz 3,7,10,2026-09-19',
    ].join('\n');

    const res = await request(app)
      .post(`/api/courses/${courseId}/grades/import`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), 'grades.csv');

    expect(res.status).toBe(207);
    expect(res.body.imported).toBe(2);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].row).toBe(3);
  });
});

describe('attendance', () => {
  let token;
  let courseId;

  beforeAll(async () => {
    token = await registerUser('attendance-owner@example.com');
    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(validCoursePayload());
    courseId = courseRes.body._id;
  });

  test('logs attendance and rejects a duplicate same-day entry', async () => {
    const firstRes = await request(app)
      .post(`/api/courses/${courseId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-09-10', status: 'present' });
    expect(firstRes.status).toBe(201);

    const duplicateRes = await request(app)
      .post(`/api/courses/${courseId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-09-10', status: 'absent' });
    expect(duplicateRes.status).toBe(409);
  });
});

describe('cross-user data isolation', () => {
  let ownerToken;
  let intruderToken;
  let courseId;
  let gradeId;

  beforeAll(async () => {
    ownerToken = await registerUser('owner@example.com');
    intruderToken = await registerUser('intruder@example.com');

    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(validCoursePayload());
    courseId = courseRes.body._id;

    const gradeRes = await request(app)
      .post(`/api/courses/${courseId}/grades`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ category: 'Assignments', title: 'HW1', score: 8, maxScore: 10, date: '2026-09-01' });
    gradeId = gradeRes.body._id;
  });

  test("a second user cannot read another student's course list entries", async () => {
    const res = await request(app).get('/api/courses').set('Authorization', `Bearer ${intruderToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((c) => c._id === courseId)).toBe(false);
  });

  test("a second user cannot read another student's course by id", async () => {
    const res = await request(app)
      .get(`/api/courses/${courseId}/grades`)
      .set('Authorization', `Bearer ${intruderToken}`);
    expect(res.status).toBe(404);
  });

  test("a second user cannot update another student's course", async () => {
    const res = await request(app)
      .put(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ targetGrade: 0 });
    expect(res.status).toBe(404);
  });

  test("a second user cannot delete another student's course", async () => {
    const res = await request(app)
      .delete(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    expect(res.status).toBe(404);
  });

  test("a second user cannot update another student's grade entry", async () => {
    const res = await request(app)
      .put(`/api/grades/${gradeId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ score: 10 });
    expect(res.status).toBe(404);
  });

  test("a second user cannot delete another student's grade entry", async () => {
    const res = await request(app)
      .delete(`/api/grades/${gradeId}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    expect(res.status).toBe(404);
  });
});
