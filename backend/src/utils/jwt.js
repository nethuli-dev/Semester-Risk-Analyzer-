const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
} = require('../config/constants');

// Access and refresh tokens are signed with *different* secrets, so a
// leaked access-token secret doesn't also let an attacker mint refresh
// tokens (and vice versa).
//
// jti is a random per-token id. Without it, two tokens signed for the same
// user within the same second (e.g. login immediately followed by refresh)
// would have identical {sub, iat, exp} payloads, and since JWT signing is
// deterministic, would produce byte-for-byte identical strings.
function signAccessToken(userId) {
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
