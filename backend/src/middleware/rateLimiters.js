const rateLimit = require('express-rate-limit');
const {
  LOGIN_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  QUERY_RATE_LIMIT_WINDOW_MS,
  QUERY_RATE_LIMIT_MAX_REQUESTS,
} = require('../config/constants');

// Brute-force protection on login: caps password-guess attempts per IP
// within the window, independent of whether the account itself exists.
const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  max: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

// Every NL question costs a real LLM call (sometimes two, with a retry).
// Keyed by authenticated user, not IP — this is cost control on a
// per-student basis, not anti-abuse-by-anonymous-traffic.
const queryLimiter = rateLimit({
  windowMs: QUERY_RATE_LIMIT_WINDOW_MS,
  max: QUERY_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many questions asked recently. Try again later.' },
});

module.exports = { loginLimiter, queryLimiter };
