const AppError = require('./AppError');

// The risk engine only counts a grade if its category matches one in the
// course's grading scheme, so a typo ("homework" vs "Homework") would
// otherwise be saved and then silently ignored. Match case-insensitively and
// return the scheme's own spelling; return null when there's no match.
function resolveCategory(gradingScheme, input) {
  const wanted = String(input).trim().toLowerCase();
  const match = gradingScheme.find((item) => item.category.trim().toLowerCase() === wanted);
  return match ? match.category : null;
}

function unknownCategoryMessage(gradingScheme, input) {
  const valid = gradingScheme.map((item) => item.category).join(', ');
  return `Category "${input}" isn't in this course's grading scheme. Use one of: ${valid}.`;
}

function requireCategory(gradingScheme, input) {
  const resolved = resolveCategory(gradingScheme, input);
  if (!resolved) throw new AppError(unknownCategoryMessage(gradingScheme, input), 400);
  return resolved;
}

module.exports = { resolveCategory, unknownCategoryMessage, requireCategory };
