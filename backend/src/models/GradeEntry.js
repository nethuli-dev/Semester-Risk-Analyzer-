const mongoose = require('mongoose');

// Referenced, not embedded in Course: a course can accumulate dozens of
// entries over a term, and "course + all its grades" is rarely needed as
// a single atomic read.
const gradeEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    category: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

gradeEntrySchema.index({ userId: 1, courseId: 1 });
gradeEntrySchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('GradeEntry', gradeEntrySchema);
