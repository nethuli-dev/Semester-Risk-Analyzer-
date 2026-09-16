// Central place for magic numbers so they're named, tunable, and greppable
// instead of scattered as bare literals through the auth code.

const BCRYPT_COST_FACTOR = 12;

const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';
// Mirrors REFRESH_TOKEN_EXPIRES numerically (30 days in ms) for computing
// the refreshTokens collection's `expiresAt` field.
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;

module.exports = {
  BCRYPT_COST_FACTOR,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES_MS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
};
