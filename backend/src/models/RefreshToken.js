const mongoose = require('mongoose');

// Stores only a hash of each refresh token (never the raw token) so a DB
// leak alone can't be used to mint sessions. One row per issued token lets
// a user hold multiple concurrent sessions (e.g. phone + laptop) and lets
// a single session be revoked without logging out everywhere.
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
