const express = require('express');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiters');
const {
  register,
  login,
  refresh,
  logout,
  registerSchema,
  loginSchema,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);

module.exports = router;
