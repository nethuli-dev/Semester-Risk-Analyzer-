require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

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
