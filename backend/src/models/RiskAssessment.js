const mongoose = require('mongoose');
const { RISK_LEVELS } = require('../config/constants');

const factorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contribution: { type: Number, required: true },
    // true = shown to the student but NOT part of riskScore (e.g. gap to target).
    informational: { type: Boolean, default: false },
  },
  { _id: false }
);

// Kept as its own collection (not overwritten in-place on Course) so a
// student can see risk trend over the semester, not just current state.
const riskAssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  computedAt: { type: Date, required: true, default: Date.now },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, required: true, enum: RISK_LEVELS },
  factors: { type: [factorSchema], default: [] },
  recommendation: { type: String, required: true },
});

riskAssessmentSchema.index({ userId: 1, courseId: 1, computedAt: -1 });

module.exports = mongoose.model('RiskAssessment', riskAssessmentSchema);
