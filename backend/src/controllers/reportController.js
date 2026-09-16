const { z } = require('zod');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Course = require('../models/Course');
const Report = require('../models/Report');
const { computeAndStoreRisk } = require('./riskController');
const { generateReport } = require('../services/reportGenerator');

const generateReportSchema = z
  .object({
    term: z.string().trim().min(1).max(50),
  })
  .strict();

async function generateReportForTerm(req, res, next) {
  try {
    const { term } = req.body;

    const courses = await Course.find({ userId: req.user.id, term });
    if (courses.length === 0) {
      return next(new AppError(`No courses found for term "${term}"`, 404));
    }

    const user = await User.findById(req.user.id);

    // Every number here comes from the SAME deterministic risk engine the
    // dashboard uses (Phase 3) — the report generator only narrates these,
    // it never computes or invents them.
    const courseSummaries = await Promise.all(
      courses.map(async (course) => {
        const assessment = await computeAndStoreRisk(course, req.user.id);
        return {
          courseId: course._id,
          courseName: course.courseName,
          courseCode: course.courseCode,
          riskLevel: assessment.riskLevel,
          riskScore: assessment.riskScore,
          trajectoryGrade: assessment.trajectoryGrade,
          attendanceRate: assessment.attendanceRate,
          factors: assessment.factors,
          recommendation: assessment.recommendation,
        };
      })
    );

    const content = await generateReport({ studentName: user.name, term, courseSummaries });

    const riskSummary = courseSummaries.map((c) => ({
      courseId: c.courseId,
      courseName: c.courseName,
      riskLevel: c.riskLevel,
      riskScore: c.riskScore,
    }));

    // One report per student per term — regenerating overwrites, per §7.
    const report = await Report.findOneAndUpdate(
      { userId: req.user.id, term },
      { content, riskSummary, generatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(report);
  } catch (err) {
    next(err);
  }
}

async function getReport(req, res, next) {
  try {
    const report = await Report.findOne({ userId: req.user.id, term: req.params.term });
    if (!report) {
      return next(new AppError(`No report generated yet for term "${req.params.term}"`, 404));
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateReportForTerm, getReport, generateReportSchema };
