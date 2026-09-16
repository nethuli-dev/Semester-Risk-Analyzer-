require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// This machine's default DNS resolver intermittently fails SRV lookups for
// the Atlas hostname specifically (confirmed: plain A-record lookups for
// other domains succeed throughout the same outage) while public resolvers
// handle the same query reliably. dns.setServers() only redirects Node's
// dns.resolve*() family (used for the SRV/TXT lookup mongodb+srv:// needs);
// dns.lookup() — used for the individual shard hostnames afterwards — goes
// through the OS resolver regardless, so it's patched too, with the
// original behavior kept as a fallback if resolve4 itself fails.
dns.setServers(['8.8.8.8', '1.1.1.1']);
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || !addresses.length) {
      return originalLookup(hostname, options, callback);
    }
    callback(null, addresses[0], 4);
  });
};

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '30d';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

const app = require('../src/app');

// Tests run against a dedicated test database on the same Atlas cluster as
// dev, not a local in-memory mongod. mongodb-memory-server's locally-spawned
// mongod fails its initial handshake against this driver/Node version
// ("Missing required sub-document 'driver' in the client metadata document")
// while Atlas — running the same driver version — connects fine, so the
// fault is in the local-handshake path, not our code. Swapping the db name
// keeps this from ever touching real dev/prod data.
function testDbUri() {
  return process.env.MONGODB_URI.replace(/\/([^/?]+)(\?|$)/, '/semester-risk-analyzer-test$2');
}

// This machine's network intermittently fails the DNS lookup mongodb+srv://
// depends on (transient, not app-related — same URI connects fine most of
// the time). A few short retries absorb that without masking a real outage:
// after this many consecutive failures, the error is real and should surface.
async function connectWithRetries(uri, attempts = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

beforeAll(async () => {
  await connectWithRetries(testDbUri());
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
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
    const res = await request(app).get('/api/protected-test');
    expect(res.status).toBe(401);
  });

  test('protected route rejects an expired access token', async () => {
    const expiredToken = jwt.sign(
      { sub: '507f1f77bcf86cd799439011' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: -10 } // already expired 10s ago
    );

    const res = await request(app)
      .get('/api/protected-test')
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
      .get('/api/protected-test')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.userId).toBeDefined();

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
