const { parse } = require('csv-parse/sync');
const { z } = require('zod');
const GradeEntry = require('../models/GradeEntry');
const AttendanceRecord = require('../models/AttendanceRecord');
const { ATTENDANCE_STATUSES } = require('../config/constants');
const { resolveCategory, unknownCategoryMessage } = require('../utils/gradeCategory');

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
async function parseGradeCsv(buffer, { userId, courseId, gradingScheme }) {
  let rows;
  try {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    return { imported: 0, failed: 0, errors: [{ row: 0, message: `Could not parse CSV: ${err.message}` }] };
  }

  const toInsert = [];
  const errors = [];

  // Re-importing the same file must not double-count every grade, so a row
  // identical to one already saved (same category, title, date and score) is
  // reported and skipped, not inserted again.
  const existing = await GradeEntry.find({ userId, courseId }).select('category title date score maxScore');
  const keyOf = (g) => `${g.category}|${g.title}|${new Date(g.date).toISOString().slice(0, 10)}|${g.score}|${g.maxScore}`;
  const seenKeys = new Set(existing.map(keyOf));

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
    // Match the category to the course's grading scheme (case-insensitive) so
    // a typo can't import "successfully" and then never count toward risk.
    const category = resolveCategory(gradingScheme, result.data.category);
    if (!category) {
      errors.push({ row: rowNumber, message: `category: ${unknownCategoryMessage(gradingScheme, result.data.category)}` });
      return;
    }
    const candidate = { ...result.data, category, userId, courseId };
    const key = keyOf(candidate);
    if (seenKeys.has(key)) {
      errors.push({ row: rowNumber, message: `duplicate: "${candidate.title}" on ${key.split('|')[2]} is already recorded` });
      return;
    }
    seenKeys.add(key);
    toInsert.push(candidate);
  });

  const inserted = toInsert.length > 0 ? await GradeEntry.insertMany(toInsert) : [];

  return { imported: inserted.length, failed: errors.length, errors };
}

const attendanceRowSchema = z.object({
  date: z.coerce.date(),
  status: z.string().trim().toLowerCase().pipe(z.enum(ATTENDANCE_STATUSES)),
});

// Same contract as parseGradeCsv: every row judged on its own, nothing
// swallowed. Rows for a date that already has a record are reported as
// duplicates (the unique index on {userId, courseId, date} enforces one
// record per class day), not silently overwritten.
async function parseAttendanceCsv(buffer, { userId, courseId }) {
  let rows;
  try {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    return { imported: 0, failed: 0, errors: [{ row: 0, message: `Could not parse CSV: ${err.message}` }] };
  }

  const errors = [];
  const candidates = []; // { rowNumber, doc }
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = attendanceRowSchema.safeParse(row);
    if (!result.success) {
      errors.push({
        row: rowNumber,
        message: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      });
      return;
    }
    candidates.push({ rowNumber, doc: { ...result.data, userId, courseId } });
  });

  // The same date twice inside one file would also trip the unique index;
  // name it precisely instead of leaving it to a database error.
  const seen = new Set();
  const unique = [];
  for (const candidate of candidates) {
    const key = candidate.doc.date.toISOString().slice(0, 10);
    if (seen.has(key)) {
      errors.push({ row: candidate.rowNumber, message: `date: ${key} appears more than once in this file` });
    } else {
      seen.add(key);
      unique.push(candidate);
    }
  }

  let imported = 0;
  if (unique.length > 0) {
    try {
      const inserted = await AttendanceRecord.insertMany(
        unique.map((c) => c.doc),
        { ordered: false }
      );
      imported = inserted.length;
    } catch (err) {
      // ordered:false keeps inserting past duplicates; the failed ones come
      // back as writeErrors carrying the index of the offending document.
      if (!err.writeErrors) throw err;
      imported = err.insertedDocs?.length ?? unique.length - err.writeErrors.length;
      for (const writeError of err.writeErrors) {
        // The driver wraps the raw server error under .err
        const detail = writeError.err ?? writeError;
        const candidate = unique[detail.index ?? writeError.index];
        errors.push({
          row: candidate.rowNumber,
          message: detail.code === 11000 ? 'date: attendance is already recorded for this date' : (detail.errmsg ?? 'could not be saved'),
        });
      }
    }
  }

  errors.sort((a, b) => a.row - b.row);
  return { imported, failed: errors.length, errors };
}

module.exports = { parseGradeCsv, parseAttendanceCsv };
