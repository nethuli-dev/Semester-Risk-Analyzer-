const mongoose = require('mongoose');

// Embedded, not referenced: small, fixed shape, always read together with
// the course, never grows unboundedly — a textbook case for embedding.
const gradingSchemeItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseName: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, trim: true },
    term: { type: String, required: true, trim: true },
    credits: { type: Number, required: true, min: 0 },
    gradingScheme: { type: [gradingSchemeItemSchema], required: true },
    targetGrade: { type: Number, min: 0, max: 100 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

courseSchema.index({ userId: 1, term: 1 });

module.exports = mongoose.model('Course', courseSchema);
