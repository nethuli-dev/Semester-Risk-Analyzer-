const express = require('express');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiters');
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  updateProfile,
  changePassword,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
router.patch('/me', authMiddleware, validate(updateProfileSchema), updateProfile);
// loginLimiter here too: this endpoint verifies a password, so it is a
// password-guessing oracle for anyone holding a stolen access token.
router.post('/change-password', authMiddleware, loginLimiter, validate(changePasswordSchema), changePassword);
router.post('/logout-all', authMiddleware, logoutAll);

module.exports = router;
