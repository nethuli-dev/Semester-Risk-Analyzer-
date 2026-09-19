const Course = require('../models/Course');
const GradeEntry = require('../models/GradeEntry');
const AttendanceRecord = require('../models/AttendanceRecord');
const RiskAssessment = require('../models/RiskAssessment');
const { assessCourseRisk } = require('../services/riskEngine');
const { findOwnedCourseOrFail } = require('./courseController');

// Computes a fresh assessment for one course from its current grades and
// attendance. Every GET /api/risk call is a real recomputation, not a cached
// read. The result is persisted as a new RiskAssessment row only when it
// differs from the latest stored one (§7 "riskAssessments" is append-only by
// design, never overwritten in place) — that history powers the trend chart.
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

  // Append a history point only when something changed. Every page that shows
  // risk calls this, so storing on every call would fill the trend chart with
  // identical dots and make "risk over time" meaningless.
  const latest = await RiskAssessment.findOne({ userId, courseId: course._id }).sort({ computedAt: -1 });
  const unchanged =
    latest &&
    latest.riskScore === assessment.riskScore &&
    latest.riskLevel === assessment.riskLevel &&
    JSON.stringify(latest.factors.map(({ name, contribution }) => ({ name, contribution }))) ===
      JSON.stringify(assessment.factors.map(({ name, contribution }) => ({ name, contribution })));

  const stored = unchanged
    ? latest
    : await RiskAssessment.create({
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

module.exports = { getRisk, getRiskHistory, computeAndStoreRisk };
