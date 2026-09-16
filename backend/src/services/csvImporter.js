const { parse } = require('csv-parse/sync');
const { z } = require('zod');
const GradeEntry = require('../models/GradeEntry');

const csvRowSchema = z.object({
  category: z.string().trim().min(1),
  title: z.string().trim().min(1),
  score: z.coerce.number().min(0),
  maxScore: z.coerce.number().positive(),
  date: z.coerce.date(),
});

// Validates every row independently and reports success/failure per row
// instead of failing the whole import on one bad row (build-instructions
// §7: "Don't let csvImporter.js silently swallow bad rows").
async function parseGradeCsv(buffer, { userId, courseId }) {
  let rows;
  try {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    return { imported: 0, failed: 0, errors: [{ row: 0, message: `Could not parse CSV: ${err.message}` }] };
  }

  const toInsert = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 to account for the header row
    const result = csvRowSchema.safeParse(row);
    if (!result.success) {
      errors.push({
        row: rowNumber,
        message: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      });
      return;
    }
    toInsert.push({ ...result.data, userId, courseId });
  });

  const inserted = toInsert.length > 0 ? await GradeEntry.insertMany(toInsert) : [];

  return { imported: inserted.length, failed: errors.length, errors };
}

module.exports = { parseGradeCsv };
