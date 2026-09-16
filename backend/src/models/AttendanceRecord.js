const mongoose = require('mongoose');
const { ATTENDANCE_STATUSES } = require('../config/constants');

const attendanceRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    date: { type: Date, required: true },
    status: { type: String, required: true, enum: ATTENDANCE_STATUSES },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Prevents duplicate same-day entries for the same course.
attendanceRecordSchema.index({ userId: 1, courseId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
