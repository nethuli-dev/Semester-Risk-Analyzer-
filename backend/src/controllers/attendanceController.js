const { z } = require('zod');
const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const AppError = require('../utils/AppError');
const { findOwnedCourseOrFail } = require('./courseController');
const { ATTENDANCE_STATUSES } = require('../config/constants');
const { parseAttendanceCsv } = require('../services/csvImporter');

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

async function importAttendance(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.id, req.user.id);
    if (!req.file) {
      return next(new AppError('CSV file is required (field name: file)', 400));
    }
    const result = await parseAttendanceCsv(req.file.buffer, { userId: req.user.id, courseId: req.params.id });
    // 207: a partial import is a normal outcome, reported per row.
    res.status(207).json(result);
  } catch (err) {
    next(err);
  }
}

// Scoped by userId AND courseId: another student's record id, or one from a
// different course, is simply "not found".
async function deleteAttendance(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.id, req.user.id);
    if (!mongoose.Types.ObjectId.isValid(req.params.recordId)) {
      return next(new AppError('Attendance record not found', 404));
    }
    const record = await AttendanceRecord.findOneAndDelete({
      _id: req.params.recordId,
      userId: req.user.id,
      courseId: req.params.id,
    });
    if (!record) {
      return next(new AppError('Attendance record not found', 404));
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listAttendance, createAttendance, importAttendance, deleteAttendance, createAttendanceSchema };
