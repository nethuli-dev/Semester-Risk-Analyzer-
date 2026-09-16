const mongoose = require('mongoose');

const courseRiskSummarySchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, required: true },
    riskLevel: { type: String, required: true },
    riskScore: { type: Number, required: true },
  },
  { _id: false }
);

// One per student per term, regenerated (upserted) rather than
// accumulated — §7 "One per student per term, regeneratable."
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  term: { type: String, required: true },
  generatedAt: { type: Date, required: true, default: Date.now },
  content: { type: String, required: true }, // markdown, LLM-written narrative
  riskSummary: { type: [courseRiskSummarySchema], default: [] }, // the real computed numbers the narrative is grounded in
});

reportSchema.index({ userId: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
