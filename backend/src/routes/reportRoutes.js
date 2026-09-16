const express = require('express');
const validate = require('../middleware/validate');
const { generateReportForTerm, getReport, generateReportSchema } = require('../controllers/reportController');

const router = express.Router();

router.post('/generate', validate(generateReportSchema), generateReportForTerm);
router.get('/:term', getReport);

module.exports = router;
