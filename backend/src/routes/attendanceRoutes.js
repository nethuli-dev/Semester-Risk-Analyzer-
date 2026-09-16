const express = require('express');
const validate = require('../middleware/validate');
const { listAttendance, createAttendance, createAttendanceSchema } = require('../controllers/attendanceController');

// Nested under /api/courses/:id/attendance — mergeParams gives access to
// the parent router's :id (the course id). No standalone by-id routes:
// the API design doesn't expose editing/deleting individual attendance
// records, only logging and listing them.
const nestedRouter = express.Router({ mergeParams: true });
nestedRouter.get('/', listAttendance);
nestedRouter.post('/', validate(createAttendanceSchema), createAttendance);

module.exports = { nestedRouter };
