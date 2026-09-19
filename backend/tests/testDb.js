require('dotenv').config();
const mongoose = require('mongoose');

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
async function connectTestDb(attempts = 3, delayMs = 3000) {
  const uri = testDbUri();
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

async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

module.exports = { connectTestDb, disconnectTestDb };
