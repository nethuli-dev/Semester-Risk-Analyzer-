const jwt = require('jsonwebtoken');
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

describe('auth flow', () => {
  const credentials = {
    name: 'Test Student',
    email: 'student@example.com',
    password: 'correct-horse-battery-staple',
  };

  test('register creates a user and returns an access token + refresh cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toMatchObject({ name: credentials.name, email: credentials.email });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'].some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  test('login with correct credentials returns an access token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('login with wrong password is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  test('protected route rejects requests with no token', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(401);
  });

  test('protected route rejects an expired access token', async () => {
    const expiredToken = jwt.sign(
      { sub: '507f1f77bcf86cd799439011' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: -10 } // already expired 10s ago
    );

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  test('full flow: login -> protected route -> refresh -> logout', async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(loginRes.status).toBe(200);
    const { accessToken } = loginRes.body;

    const protectedRes = await agent
      .get('/api/courses')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(protectedRes.status).toBe(200);
    expect(Array.isArray(protectedRes.body)).toBe(true);

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.accessToken).not.toBe(accessToken);

    const logoutRes = await agent
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${refreshRes.body.accessToken}`);
    expect(logoutRes.status).toBe(204);

    // After logout, the revoked refresh token must no longer work.
    const refreshAfterLogout = await agent.post('/api/auth/refresh');
    expect(refreshAfterLogout.status).toBe(401);
  });
});
