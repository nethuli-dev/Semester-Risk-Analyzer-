const express = require('express');
const validate = require('../middleware/validate');
const {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  createCourseSchema,
  updateCourseSchema,
} = require('../controllers/courseController');
const { nestedRouter: gradeNestedRouter } = require('./gradeRoutes');
const { nestedRouter: attendanceNestedRouter } = require('./attendanceRoutes');

const router = express.Router();

router.get('/', listCourses);
router.post('/', validate(createCourseSchema), createCourse);
router.put('/:id', validate(updateCourseSchema), updateCourse);
router.delete('/:id', deleteCourse);

router.use('/:id/grades', gradeNestedRouter);
router.use('/:id/attendance', attendanceNestedRouter);

module.exports = router;
