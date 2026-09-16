const Course = require('../models/Course');
const GradeEntry = require('../models/GradeEntry');
const AttendanceRecord = require('../models/AttendanceRecord');
const RiskAssessment = require('../models/RiskAssessment');
const { assessCourseRisk } = require('../services/riskEngine');
const { findOwnedCourseOrFail } = require('./courseController');

// Computes a fresh assessment for one course from its current grades and
// attendance, then persists it as a new RiskAssessment row. Every GET
// /api/risk call is a real recomputation, not a cached read — and every
// call also becomes one more point on that course's risk-over-time trend
// chart (§7 "riskAssessments" is append-only by design, never overwritten
// in place).
async function computeAndStoreRisk(course, userId) {
  const [gradeEntries, attendanceRecords] = await Promise.all([
    GradeEntry.find({ userId, courseId: course._id }),
    AttendanceRecord.find({ userId, courseId: course._id }),
  ]);

  const assessment = assessCourseRisk({
    gradingScheme: course.gradingScheme,
    gradeEntries,
    attendanceRecords,
    targetGrade: course.targetGrade,
  });

  const stored = await RiskAssessment.create({
    userId,
    courseId: course._id,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    factors: assessment.factors,
    recommendation: assessment.recommendation,
  });

  return { ...assessment, computedAt: stored.computedAt };
}

async function getRisk(req, res, next) {
  try {
    const courses = await Course.find({ userId: req.user.id });
    const results = await Promise.all(
      courses.map(async (course) => ({
        course,
        ...(await computeAndStoreRisk(course, req.user.id)),
      }))
    );
    res.json(results);
  } catch (err) {
    next(err);
  }
}

async function getRiskHistory(req, res, next) {
  try {
    await findOwnedCourseOrFail(req.params.courseId, req.user.id);
    const history = await RiskAssessment.find({
      userId: req.user.id,
      courseId: req.params.courseId,
    }).sort({ computedAt: -1 });
    res.json(history);
  } catch (err) {
    next(err);
  }
}

module.exports = { getRisk, getRiskHistory };
