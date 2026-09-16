const express = require('express');
const multer = require('multer');
const validate = require('../middleware/validate');
const {
  listGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  importGrades,
  createGradeSchema,
  updateGradeSchema,
} = require('../controllers/gradeController');
const { MAX_CSV_SIZE_BYTES } = require('../config/constants');

// CSV buffered in memory (not written to disk) since imports are small and
// short-lived — nothing here needs to survive past the request.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CSV_SIZE_BYTES } });

// Nested under /api/courses/:id/grades — mergeParams gives access to the
// parent router's :id (the course id).
const nestedRouter = express.Router({ mergeParams: true });
nestedRouter.get('/', listGrades);
nestedRouter.post('/', validate(createGradeSchema), createGrade);
nestedRouter.post('/import', upload.single('file'), importGrades);

// Standalone /api/grades/:id — editing/deleting a single grade entry
// doesn't need its parent course in the URL.
const byIdRouter = express.Router();
byIdRouter.put('/:id', validate(updateGradeSchema), updateGrade);
byIdRouter.delete('/:id', deleteGrade);

module.exports = { nestedRouter, byIdRouter };
