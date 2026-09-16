const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select: false -> excluded from query results by default, so a
    // stray `res.json(user)` can never leak the hash unless explicitly
    // requested with `.select('+passwordHash')`.
    passwordHash: { type: String, required: true, select: false },
    university: { type: String, trim: true },
    program: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('User', userSchema);
