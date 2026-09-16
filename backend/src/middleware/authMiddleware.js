const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

// The single source of truth for "who is making this request." Every
// controller reads req.user.id from here — never from req.body/req.params
// — so a client can never impersonate another user by supplying a
// different userId in a request.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    next(new AppError('Unauthorized', 401));
  }
}

module.exports = authMiddleware;
