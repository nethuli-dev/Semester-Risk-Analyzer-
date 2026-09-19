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

const PASSWORD = 'correct-horse-battery-staple';

async function registerAgent(email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name: 'Profile Tester', email, password: PASSWORD });
  return { agent, token: res.body.accessToken };
}

describe('profile', () => {
  test('GET /me returns profile fields and never the password hash', async () => {
    const { agent, token } = await registerAgent('me@example.com');
    const res = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Profile Tester', email: 'me@example.com', university: '', program: '' });
    expect(res.body.user.createdAt).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  test('PATCH /me updates name, university and program', async () => {
    const { agent, token } = await registerAgent('edit@example.com');
    const res = await agent
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', university: 'State U', program: 'Computer Science' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'New Name', university: 'State U', program: 'Computer Science' });
  });

  test('PATCH /me rejects fields a client must never set (email, userId, passwordHash)', async () => {
    const { agent, token } = await registerAgent('smuggle@example.com');
    for (const body of [{ email: 'evil@example.com' }, { userId: '507f1f77bcf86cd799439011' }, { passwordHash: 'x' }]) {
      const res = await agent.patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send(body);
      expect(res.status).toBe(400);
    }
    const me = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user.email).toBe('smuggle@example.com');
  });

  test('PATCH /me requires authentication', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('change password', () => {
  test('wrong current password is rejected and nothing changes', async () => {
    const { agent, token } = await registerAgent('wrongcur@example.com');
    const res = await agent
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'not-my-password', newPassword: 'a-brand-new-password' });
    expect(res.status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: 'wrongcur@example.com', password: PASSWORD });
    expect(login.status).toBe(200);
  });

  test('success: old password stops working, new works, OTHER sessions are revoked, this one survives', async () => {
    const first = await registerAgent('rotate@example.com'); // "laptop"
    const phone = request.agent(app);
    const phoneLogin = await phone.post('/api/auth/login').send({ email: 'rotate@example.com', password: PASSWORD });
    expect(phoneLogin.status).toBe(200);

    const res = await first.agent
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${first.token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'a-brand-new-password' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    // The session that changed the password keeps working...
    expect((await first.agent.post('/api/auth/refresh')).status).toBe(200);
    // ...the other device's refresh token is dead.
    expect((await phone.post('/api/auth/refresh')).status).toBe(401);

    expect((await request(app).post('/api/auth/login').send({ email: 'rotate@example.com', password: PASSWORD })).status).toBe(401);
    expect(
      (await request(app).post('/api/auth/login').send({ email: 'rotate@example.com', password: 'a-brand-new-password' })).status
    ).toBe(200);
  });

  test('new password must differ and meet the length minimum', async () => {
    const { agent, token } = await registerAgent('rules@example.com');
    const same = await agent
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(same.status).toBe(400);
    const short = await agent
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'short' });
    expect(short.status).toBe(400);
  });
});

describe('log out everywhere', () => {
  test('revokes every session for the user', async () => {
    const a = await registerAgent('everywhere@example.com');
    const b = request.agent(app);
    await b.post('/api/auth/login').send({ email: 'everywhere@example.com', password: PASSWORD });

    const res = await a.agent.post('/api/auth/logout-all').set('Authorization', `Bearer ${a.token}`);
    expect(res.status).toBe(204);
    expect((await a.agent.post('/api/auth/refresh')).status).toBe(401);
    expect((await b.post('/api/auth/refresh')).status).toBe(401);
  });
});
