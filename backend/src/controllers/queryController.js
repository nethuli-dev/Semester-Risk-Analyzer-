const { z } = require('zod');
const AppError = require('../utils/AppError');
const Query = require('../models/Query');
const Course = require('../models/Course');
const GradeEntry = require('../models/GradeEntry');
const AttendanceRecord = require('../models/AttendanceRecord');
const RiskAssessment = require('../models/RiskAssessment');
const { generatePipeline, summarizeResult } = require('../services/pipelineGenerator');
const { validatePipeline, executePipeline } = require('../services/pipelineValidator');
const { findOwnedCourseOrFail } = require('./courseController');
const { QUERY_MAX_RETRIES } = require('../config/constants');

const COLLECTION_MODELS = {
  courses: Course,
  gradeEntries: GradeEntry,
  attendanceRecords: AttendanceRecord,
  riskAssessments: RiskAssessment,
};

const askQuestionSchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    courseId: z.string().optional(),
  })
  .strict();

// A Gemini call can fail before there's even a pipeline to validate (e.g.
// malformed JSON escaping in its output) — that's just as retry-worthy as
// a rejected pipeline, not a different failure class, so both paths
// funnel through the same { attempt, validation } shape here.
async function generateAndValidate({ question, feedback, courseName, userId, courseId }) {
  let attempt;
  try {
    attempt = await generatePipeline({ question, feedback, courseName });
  } catch (err) {
    return { attempt: null, validation: { valid: false, reason: `Pipeline generation failed: ${err.message}` } };
  }
  const validation = validatePipeline(attempt.pipeline, { collection: attempt.collection, userId, courseId });
  return { attempt, validation };
}

// generate -> validate -> (if invalid: regenerate ONCE with the
// validator's rejection reason as feedback -> re-validate) -> execute ->
// summarize -> store -> respond. Never executes anything that hasn't
// passed validatePipeline — no "just this once" shortcuts, including on
// the retry path.
async function askQuestion(req, res, next) {
  try {
    const { question, courseId } = req.body;

    let course = null;
    if (courseId) {
      course = await findOwnedCourseOrFail(courseId, req.user.id);
    }

    let { attempt, validation } = await generateAndValidate({
      question,
      courseName: course?.courseName,
      userId: req.user.id,
      courseId,
    });
    let attemptsUsed = 1;

    if (!validation.valid) {
      for (let i = 0; i < QUERY_MAX_RETRIES; i += 1) {
        ({ attempt, validation } = await generateAndValidate({
          question,
          feedback: validation.reason,
          courseName: course?.courseName,
          userId: req.user.id,
          courseId,
        }));
        attemptsUsed += 1;
        if (validation.valid) break;
      }
    }

    if (!validation.valid) {
      await Query.create({
        userId: req.user.id,
        question,
        targetCollection: attempt?.collection,
        generatedPipeline: attempt?.pipeline,
        validationStatus: 'failed',
        rejectionReason: validation.reason,
      });
      return next(
        new AppError(`Could not answer this question (tried ${attemptsUsed} time(s)): ${validation.reason}`, 422)
      );
    }

    const Model = COLLECTION_MODELS[attempt.collection];
    const result = await executePipeline(Model, validation.pipeline);
    const summary = await summarizeResult({ question, result });
    const chartConfig = { type: summary.chartType, data: result };

    await Query.create({
      userId: req.user.id,
      question,
      targetCollection: attempt.collection,
      generatedPipeline: validation.pipeline,
      validationStatus: attemptsUsed > 1 ? 'invalid_retried' : 'valid',
      resultSummary: summary.answer,
      chartConfig,
    });

    res.json({
      answer: summary.answer,
      chartConfig,
      generatedPipeline: validation.pipeline,
      result,
    });
  } catch (err) {
    next(err);
  }
}

async function listQueries(req, res, next) {
  try {
    const queries = await Query.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    next(err);
  }
}

module.exports = { askQuestion, listQueries, askQuestionSchema };
