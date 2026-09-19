const request = require('supertest');
const { connectTestDb, disconnectTestDb } = require('./testDb');

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '30d';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

const app = require('../src/app');

let auth;
let courseId;
let otherAuth;

async function register(email) {
  const res = await request(app).post('/api/auth/register').send({ name: 'Import Tester', email, password: 'correct-horse-battery-staple' });
  return { Authorization: `Bearer ${res.body.accessToken}` };
}

beforeAll(async () => {
  await connectTestDb();
  auth = await register('import-owner@example.com');
  otherAuth = await register('import-other@example.com');
  const course = await request(app)
    .post('/api/courses')
    .set(auth)
    .send({
      courseName: 'Chemistry', courseCode: 'CHM101', term: 'Fall 2026', credits: 3,
      gradingScheme: [{ category: 'Homework', weight: 40 }, { category: 'Final', weight: 60 }],
    });
  courseId = course.body._id;
}, 60000);
afterAll(disconnectTestDb, 30000);

const uploadCsv = (path, csv, who = auth) =>
  request(app).post(`/api/courses/${courseId}/${path}/import`).set(who).attach('file', Buffer.from(csv), 'data.csv');

describe('grade categories must match the grading scheme', () => {
  test('manual create: matches case-insensitively and stores the scheme\'s spelling', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/grades`)
      .set(auth)
      .send({ category: '  homework ', title: 'HW1', score: 8, maxScore: 10, date: '2026-09-01' });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('Homework');
  });

  test('manual create: an unknown category is rejected and names the valid ones', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/grades`)
      .set(auth)
      .send({ category: 'Quiz', title: 'Q1', score: 8, maxScore: 10, date: '2026-09-01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Homework, Final/);
  });

  test('editing a grade into an unknown category is rejected', async () => {
    const created = await request(app)
      .post(`/api/courses/${courseId}/grades`)
      .set(auth)
      .send({ category: 'Final', title: 'Final exam', score: 70, maxScore: 100, date: '2026-12-01' });
    const res = await request(app).put(`/api/grades/${created.body._id}`).set(auth).send({ category: 'Nope' });
    expect(res.status).toBe(400);
  });

  test('CSV: normalizes matching categories, reports unknown ones per row', async () => {
    const res = await uploadCsv('grades', [
      'category,title,score,maxScore,date',
      'HOMEWORK,HW2,9,10,2026-09-08',
      'Labs,Lab 1,10,10,2026-09-09',
      'final,Practice final,80,100,2026-09-10',
    ].join('\n'));
    expect(res.status).toBe(207);
    expect(res.body.imported).toBe(2);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].row).toBe(3);
    expect(res.body.errors[0].message).toMatch(/Labs.*Homework, Final/);
  });
});

describe('re-importing a grades file', () => {
  test('does not double-count: identical rows are reported as duplicates and skipped', async () => {
    const csv = ['category,title,score,maxScore,date', 'Final,Repeat exam,55,100,2026-12-05', 'Final,Repeat exam 2,60,100,2026-12-06'].join('\n');
    const first = await uploadCsv('grades', csv);
    expect(first.body.imported).toBe(2);
    const second = await uploadCsv('grades', csv);
    expect(second.body.imported).toBe(0);
    expect(second.body.failed).toBe(2);
    expect(second.body.errors[0].message).toMatch(/already recorded/);
    const grades = await request(app).get(`/api/courses/${courseId}/grades`).set(auth);
    expect(grades.body.filter((g) => g.title.startsWith('Repeat exam'))).toHaveLength(2);
  });
});

describe('attendance CSV import', () => {
  test('imports valid rows (any letter case) and reports bad rows and in-file duplicates', async () => {
    const res = await uploadCsv('attendance', [
      'date,status',
      '2026-09-01,Present',
      '2026-09-03,absent',
      '2026-09-05,LATE',
      '2026-09-08,maybe',
      'not-a-date,present',
      '2026-09-01,present',
    ].join('\n'));
    expect(res.status).toBe(207);
    expect(res.body.imported).toBe(3);
    expect(res.body.failed).toBe(3);
    expect(res.body.errors.map((e) => e.row)).toEqual([5, 6, 7]);
    expect(res.body.errors[2].message).toMatch(/more than once/);
  });

  test('a date that already has a record is reported, and the new rows still import', async () => {
    const res = await uploadCsv('attendance', ['date,status', '2026-09-01,present', '2026-09-10,excused'].join('\n'));
    expect(res.status).toBe(207);
    expect(res.body.imported).toBe(1);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0]).toMatchObject({ row: 2 });
    expect(res.body.errors[0].message).toMatch(/already recorded/);

    const list = await request(app).get(`/api/courses/${courseId}/attendance`).set(auth);
    expect(list.body).toHaveLength(4);
  });

  test("another student can't import into or delete from this course (404)", async () => {
    const up = await uploadCsv('attendance', 'date,status\n2026-09-20,present', otherAuth);
    expect(up.status).toBe(404);
    const list = await request(app).get(`/api/courses/${courseId}/attendance`).set(auth);
    const del = await request(app).delete(`/api/courses/${courseId}/attendance/${list.body[0]._id}`).set(otherAuth);
    expect(del.status).toBe(404);
  });

  test('a record can be deleted by its owner', async () => {
    const list = await request(app).get(`/api/courses/${courseId}/attendance`).set(auth);
    const del = await request(app).delete(`/api/courses/${courseId}/attendance/${list.body[0]._id}`).set(auth);
    expect(del.status).toBe(204);
    const after = await request(app).get(`/api/courses/${courseId}/attendance`).set(auth);
    expect(after.body).toHaveLength(3);
  });

  test('missing file is a 400', async () => {
    const res = await request(app).post(`/api/courses/${courseId}/attendance/import`).set(auth);
    expect(res.status).toBe(400);
  });
});
