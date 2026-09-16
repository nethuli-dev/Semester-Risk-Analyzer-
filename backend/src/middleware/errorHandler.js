const AppError = require('../utils/AppError');

// Single place all errors flow through. Controllers never send error
// responses directly (no `res.status(500).send(err)` inline) — they call
// next(err) and let this decide the shape of the response.
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Mongoose validation errors -> 400 instead of a raw 500.
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Unexpected/unhandled errors: log the real error server-side, never
  // leak internals (stack trace, DB error text) to the client.
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
