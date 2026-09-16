const mongoose = require('mongoose');

const VALIDATION_STATUSES = ['valid', 'invalid_retried', 'failed'];

// Audit trail of every NL question asked — every attempt is recorded, not
// just successful ones, so a rejected/malicious question is still visible
// in the student's own history with the exact reason it failed.
const querySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  question: { type: String, required: true },
  generatedPipeline: { type: mongoose.Schema.Types.Mixed },
  validationStatus: { type: String, required: true, enum: VALIDATION_STATUSES },
  targetCollection: { type: String },
  resultSummary: { type: String },
  chartConfig: { type: mongoose.Schema.Types.Mixed },
  rejectionReason: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

querySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Query', querySchema);
