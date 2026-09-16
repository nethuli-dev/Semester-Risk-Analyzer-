const express = require('express');
const validate = require('../middleware/validate');
const { queryLimiter } = require('../middleware/rateLimiters');
const { askQuestion, listQueries, askQuestionSchema } = require('../controllers/queryController');

// Mounted at /api directly (not /api/query) since the two routes use
// deliberately different paths per PROJECT_PLAN.md §9: POST /api/query
// (singular, ask a question) vs GET /api/queries (plural, history).
const router = express.Router();

router.post('/query', queryLimiter, validate(askQuestionSchema), askQuestion);
router.get('/queries', listQueries);

module.exports = router;
