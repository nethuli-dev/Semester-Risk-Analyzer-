// Central place for magic numbers so they're named, tunable, and greppable
// instead of scattered as bare literals through the auth code.

const BCRYPT_COST_FACTOR = 12;

const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';
// Mirrors REFRESH_TOKEN_EXPIRES numerically (30 days in ms) for computing
// the refreshTokens collection's `expiresAt` field.
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];

const GRADING_SCHEME_WEIGHT_TOTAL = 100;
// Floating-point tolerance for weight sums (e.g. three categories at
// 33.33/33.33/33.34 shouldn't fail on a rounding artifact).
const GRADING_SCHEME_WEIGHT_TOLERANCE = 0.01;

const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

// Below this trajectory grade (%), a course is flagged failing regardless
// of attendance.
const RISK_FAILING_THRESHOLD = 60;
// Below this trajectory grade (%), a course is flagged at-risk (unless
// already failing).
const RISK_AT_RISK_THRESHOLD = 75;
// Below this attendance rate (%), attendance itself becomes a risk factor,
// independent of grades.
const RISK_LOW_ATTENDANCE_THRESHOLD = 75;
// Risk-score points added per percentage point of attendance shortfall
// below RISK_LOW_ATTENDANCE_THRESHOLD.
const RISK_ATTENDANCE_PENALTY_WEIGHT = 0.5;

const RISK_LEVELS = ['on-track', 'at-risk', 'failing'];

module.exports = {
  BCRYPT_COST_FACTOR,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES_MS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  ATTENDANCE_STATUSES,
  GRADING_SCHEME_WEIGHT_TOTAL,
  GRADING_SCHEME_WEIGHT_TOLERANCE,
  MAX_CSV_SIZE_BYTES,
  RISK_FAILING_THRESHOLD,
  RISK_AT_RISK_THRESHOLD,
  RISK_LOW_ATTENDANCE_THRESHOLD,
  RISK_ATTENDANCE_PENALTY_WEIGHT,
  RISK_LEVELS,
};
