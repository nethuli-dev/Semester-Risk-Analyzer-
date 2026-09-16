const express = require('express');
const { getRisk, getRiskHistory } = require('../controllers/riskController');

const router = express.Router();

router.get('/', getRisk);
router.get('/:courseId/history', getRiskHistory);

module.exports = router;
