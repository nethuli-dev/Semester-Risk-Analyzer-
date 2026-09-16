const AppError = require('../utils/AppError');

// Generic zod-schema-driven body validator. `.strict()` on the schemas
// passed in here rejects unknown fields rather than silently dropping
// them, so a client can't smuggle extra fields (e.g. userId) into a body.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return next(new AppError(`Validation failed: ${message}`, 400));
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
