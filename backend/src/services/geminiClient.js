const { GoogleGenAI } = require('@google/genai');

// This is the only model this account's free-tier key was actually able
// to call successfully at build time — gemini-2.5-flash is deprecated for
// new accounts (404) and several gemini-3.x variants returned capacity/
// permission errors before this one worked. Verified against the live API,
// not assumed from documentation.
const MODEL = 'gemini-3.5-flash-lite';

// Lazily constructed so a missing GEMINI_API_KEY only breaks the one
// request that needs it, not the whole app at boot.
let client;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

module.exports = { getClient, MODEL };
