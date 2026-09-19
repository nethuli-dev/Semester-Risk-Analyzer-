const express = require('express');
const multer = require('multer');
const validate = require('../middleware/validate');
const {
  listAttendance,
  createAttendance,
  importAttendance,
  deleteAttendance,
  createAttendanceSchema,
} = require('../controllers/attendanceController');
const { MAX_CSV_SIZE_BYTES } = require('../config/constants');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CSV_SIZE_BYTES } });

// Nested under /api/courses/:id/attendance — mergeParams gives access to
// the parent router's :id (the course id). Records can be logged, imported
// and deleted (to fix a mistake); they are not edited in place — delete and
// log again.
const nestedRouter = express.Router({ mergeParams: true });
nestedRouter.get('/', listAttendance);
nestedRouter.post('/', validate(createAttendanceSchema), createAttendance);
nestedRouter.post('/import', upload.single('file'), importAttendance);
nestedRouter.delete('/:recordId', deleteAttendance);

module.exports = { nestedRouter };
