const { z } = require('zod');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const GradeEntry = require('../models/GradeEntry');
const AttendanceRecord = require('../models/AttendanceRecord');
const AppError = require('../utils/AppError');
const {
  GRADING_SCHEME_WEIGHT_TOTAL,
  GRADING_SCHEME_WEIGHT_TOLERANCE,
} = require('../config/constants');

const gradingSchemeItemSchema = z
  .object({
    category: z.string().trim().min(1).max(100),
    weight: z.number().min(0).max(100),
  })
  .strict();

// Server-side enforcement of the "weights sum to 100" rule. The frontend
// validates this too (PROJECT_PLAN §10) but that's a UX nicety, not a
// security boundary — a raw request could otherwise skip it entirely.
function weightsSumTo100(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  return Math.abs(total - GRADING_SCHEME_WEIGHT_TOTAL) <= GRADING_SCHEME_WEIGHT_TOLERANCE;
}

const createCourseSchema = z
  .object({
    courseName: z.string().trim().min(1).max(200),
    courseCode: z.string().trim().min(1).max(50),
    term: z.string().trim().min(1).max(50),
    credits: z.number().min(0).max(20),
    gradingScheme: z
      .array(gradingSchemeItemSchema)
      .min(1)
      .refine(weightsSumTo100, { message: 'Grading scheme weights must sum to 100' }),
    targetGrade: z.number().min(0).max(100).optional(),
  })
  .strict();

const updateCourseSchema = createCourseSchema.partial().strict();

// Every course lookup is scoped by userId from the verified JWT — never by
// courseId alone — so requesting someone else's course 404s rather than
// ever returning or mutating it. Shared by grade/attendance controllers
// too, since a request for those must first prove the parent course is
// the caller's own.
async function findOwnedCourseOrFail(courseId, userId) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new AppError('Course not found', 404);
  }
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) {
    throw new AppError('Course not found', 404);
  }
  return course;
}

async function listCourses(req, res, next) {
  try {
    const courses = await Course.find({ userId: req.user.id }).sort({ term: -1, createdAt: -1 });
    res.json(courses);
  } catch (err) {
    next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    const course = await Course.create({ ...req.body, userId: req.user.id });
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
}

async function updateCourse(req, res, next) {
  try {
    const course = await findOwnedCourseOrFail(req.params.id, req.user.id);
    Object.assign(course, req.body);
    await course.save();
    res.json(course);
  } catch (err) {
    next(err);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const course = await findOwnedCourseOrFail(req.params.id, req.user.id);
    // Cascade explicitly: Mongoose doesn't do this automatically, and an
    // orphaned grade/attendance row would silently skew Phase 3's risk
    // calculation if left behind.
    await Promise.all([
      GradeEntry.deleteMany({ courseId: course._id, userId: req.user.id }),
      AttendanceRecord.deleteMany({ courseId: course._id, userId: req.user.id }),
      course.deleteOne(),
    ]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  createCourseSchema,
  updateCourseSchema,
  findOwnedCourseOrFail,
};
