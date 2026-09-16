// Distinguishes expected, client-facing errors (bad input, not found, auth
// failure) from unexpected crashes, so errorHandler.js can respond
// differently to each instead of leaking stack traces for expected cases.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
