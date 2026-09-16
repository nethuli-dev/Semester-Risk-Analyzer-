const { z } = require('zod');
const AttendanceRecord = require('../models/AttendanceRecord');
const AppError = require('../utils/AppError');
const { findOwnedCourseOrFail } = require('./courseController');
const { ATTENDANCE_STATUSES } = require('../config/constants');

const createAttendanceSchema = z
  .object({
    date: z.coerce.date(),
    status: z.enum(ATTENDANCE_STATUSES),
  })
  .strict();

async function listAttendance(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.id, req.user.id);
    const records = await AttendanceRecord.find({ userId: req.user.id, courseId: req.params.id }).sort({
      date: -1,
    });
    res.json(records);
  } catch (err) {
    next(err);
  }
}

async function createAttendance(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.id, req.user.id);
    const record = await AttendanceRecord.create({
      ...req.body,
      userId: req.user.id,
      courseId: req.params.id,
    });
    res.status(201).json(record);
  } catch (err) {
    // Unique index on {userId, courseId, date} turns a duplicate same-day
    // entry into a clear 409 instead of a raw Mongo duplicate-key error.
    if (err.code === 11000) {
      return next(new AppError('Attendance already recorded for this date', 409));
    }
    next(err);
  }
}

module.exports = { listAttendance, createAttendance, createAttendanceSchema };
