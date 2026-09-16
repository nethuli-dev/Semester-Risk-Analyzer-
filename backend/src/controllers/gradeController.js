const { z } = require('zod');
const mongoose = require('mongoose');
const GradeEntry = require('../models/GradeEntry');
const AppError = require('../utils/AppError');
const { findOwnedCourseOrFail } = require('./courseController');
const { parseGradeCsv } = require('../services/csvImporter');

const createGradeSchema = z
  .object({
    category: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    score: z.number().min(0),
    maxScore: z.number().positive(),
    date: z.coerce.date(),
  })
  .strict();

const updateGradeSchema = createGradeSchema.partial().strict();

async function findOwnedGradeOrFail(gradeId, userId) {
  if (!mongoose.Types.ObjectId.isValid(gradeId)) {
    throw new AppError('Grade entry not found', 404);
  }
  const grade = await GradeEntry.findOne({ _id: gradeId, userId });
  if (!grade) {
    throw new AppError('Grade entry not found', 404);
  }
  return grade;
}

async function listGrades(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.id, req.user.id);
    const grades = await GradeEntry.find({ userId: req.user.id, courseId: req.params.id }).sort({ date: -1 });
    res.json(grades);
  } catch (err) {
    next(err);
  }
}

async function createGrade(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.id, req.user.id);
    const grade = await GradeEntry.create({ ...req.body, userId: req.user.id, courseId: req.params.id });
    res.status(201).json(grade);
  } catch (err) {
    next(err);
  }
}

async function updateGrade(req, res, next) {
  try {
    const grade = await findOwnedGradeOrFail(req.params.id, req.user.id);
    Object.assign(grade, req.body);
    await grade.save();
    res.json(grade);
  } catch (err) {
    next(err);
  }
}

async function deleteGrade(req, res, next) {
  try {
    const grade = await findOwnedGradeOrFail(req.params.id, req.user.id);
    await grade.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function importGrades(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.id, req.user.id);
    if (!req.file) {
      return next(new AppError('CSV file is required (field name: file)', 400));
    }
    const result = await parseGradeCsv(req.file.buffer, {
      userId: req.user.id,
      courseId: req.params.id,
    });
    // 207 Multi-Status: a partial success (some rows imported, some
    // rejected) is the expected/normal outcome here, not an error.
    res.status(207).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  importGrades,
  createGradeSchema,
  updateGradeSchema,
};
