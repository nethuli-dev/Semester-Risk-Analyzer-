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

// --- NL query / pipeline validator ---
// The only stage types an LLM-generated pipeline may use. Anything else
// ($out, $merge, $function, $accumulator, $where, $lookup, $graphLookup,
// ...) is rejected outright.
const ALLOWED_PIPELINE_STAGES = [
  '$match',
  '$group',
  '$project',
  '$sort',
  '$limit',
  '$addFields',
  '$unwind',
  '$count',
  '$bucket',
];

// Expression-level operators that can execute arbitrary code or legacy JS
// even inside an otherwise-allowed stage (e.g. $function nested inside a
// $project). Checked recursively everywhere in the pipeline, not just at
// the stage level, since the stage whitelist alone wouldn't catch these.
const DANGEROUS_EXPRESSION_OPERATORS = ['$function', '$accumulator', '$where'];

// Fail-closed allowlist of aggregation expression operators. A $-prefixed
// key encountered anywhere that isn't a stage name and isn't in this list
// is rejected as an unknown operator, rather than assumed safe.
const ALLOWED_EXPRESSION_OPERATORS = [
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
  '$and', '$or', '$not', '$nor', '$exists', '$type', '$expr',
  '$add', '$subtract', '$multiply', '$divide', '$mod', '$abs', '$ceil', '$floor', '$round', '$trunc',
  '$sum', '$avg', '$min', '$max', '$push', '$first', '$last',
  '$size', '$arrayElemAt', '$filter', '$map', '$slice', '$concatArrays',
  '$concat', '$substr', '$substrCP', '$toUpper', '$toLower', '$trim', '$split', '$toString',
  '$year', '$month', '$dayOfMonth', '$dateToString', '$dateFromString', '$dateDiff',
  '$cond', '$ifNull', '$switch',
  '$literal', '$toBool', '$toInt', '$toDouble', '$toDecimal', '$convert', '$meta',
];

// System variables (not document fields) allowed in "$$name" expressions.
const ALLOWED_SYSTEM_VARIABLES = ['$$NOW', '$$ROOT', '$$CURRENT', '$$REMOVE'];

const MAX_PIPELINE_STAGES = 10;
// Each level of object AND array wrapping counts separately (e.g. a single
// {$multiply: [{$divide: [...]}, 100]} expression is depth ~4 on its own),
// so this needs real headroom for legitimate nested expressions — it's
// sized to comfortably allow those while still rejecting pathological
// nesting (an adversarial pipeline built from repeated wrapping quickly
// exceeds 20+).
const MAX_PIPELINE_DEPTH = 12;
const QUERY_TIMEOUT_MS = 5000;
const QUERY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const QUERY_RATE_LIMIT_MAX_REQUESTS = 20;
// A single retry with the validator's rejection reason fed back to the
// LLM, then a clear user-facing error — never an unbounded retry loop.
const QUERY_MAX_RETRIES = 1;

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
  ALLOWED_PIPELINE_STAGES,
  DANGEROUS_EXPRESSION_OPERATORS,
  ALLOWED_EXPRESSION_OPERATORS,
  ALLOWED_SYSTEM_VARIABLES,
  MAX_PIPELINE_STAGES,
  MAX_PIPELINE_DEPTH,
  QUERY_TIMEOUT_MS,
  QUERY_RATE_LIMIT_WINDOW_MS,
  QUERY_RATE_LIMIT_MAX_REQUESTS,
  QUERY_MAX_RETRIES,
};
