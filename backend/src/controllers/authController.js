const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { z } = require('zod');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/AppError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const {
  BCRYPT_COST_FACTOR,
  REFRESH_TOKEN_EXPIRES_MS,
} = require('../config/constants');

const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(200),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email().max(200),
    password: z.string().min(1).max(200),
  })
  .strict();

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    university: z.string().trim().max(150).optional(),
    program: z.string().trim().max(150).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8).max(200),
  })
  .strict();

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: REFRESH_TOKEN_EXPIRES_MS,
};

// Refresh tokens are opaque, high-entropy JWTs on the wire, but what we
// persist is a SHA-256 hash of the token string — never the raw token —
// so a leaked DB row can't be replayed as a valid session.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokenPair(userId) {
  const accessToken = signAccessToken(userId.toString());
  const refreshToken = signRefreshToken(userId.toString());

  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS),
  });

  return { accessToken, refreshToken };
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return next(new AppError('Email already registered', 409));
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
    const user = await User.create({ name, email, passwordHash });

    const { accessToken, refreshToken } = await issueTokenPair(user._id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // +passwordHash overrides the model's `select: false` for this one
    // query — the hash is needed here to compare, but never leaves this
    // function.
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return next(new AppError('Invalid email or password', 401));
    }

    const { accessToken, refreshToken } = await issueTokenPair(user._id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      return next(new AppError('No refresh token provided', 401));
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const stored = await RefreshToken.findOne({
      userId: payload.sub,
      tokenHash: hashToken(token),
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return next(new AppError('Refresh token revoked or expired', 401));
    }

    const accessToken = signAccessToken(payload.sub);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      await RefreshToken.updateOne(
        { userId: req.user.id, tokenHash: hashToken(token) },
        { revoked: true }
      );
    }
    const { maxAge, ...clearCookieOptions } = REFRESH_COOKIE_OPTIONS;
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Not in PROJECT_PLAN's original API table — added because the frontend's
// silent session-restore-on-reload (refresh the access token via the
// httpOnly cookie, then need *something* to populate the UI with) has
// nothing else to call: /auth/refresh intentionally returns only a new
// access token, never user data.
async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// The one place that decides which User fields ever leave the server.
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    university: user.university ?? '',
    program: user.program ?? '',
    createdAt: user.createdAt,
  };
}

// Email is deliberately NOT editable here: it's the login identifier, and
// changing it safely needs re-verification we haven't built. The schema is
// .strict(), so a body containing email/userId/passwordHash is rejected
// outright rather than silently ignored.
async function updateProfile(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { $set: req.body }, { new: true, runValidators: true });
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// Re-verifies the current password (a stolen access token alone must not be
// enough to take over an account), then revokes EVERY refresh token — so a
// session an attacker may hold on another device dies — and issues a fresh
// pair so the student who just changed it stays logged in here. Access
// tokens already issued stay valid until they expire (<=15 min); that's the
// accepted trade-off of stateless JWT access tokens.
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return next(new AppError('Current password is incorrect', 401));
    }
    if (currentPassword === newPassword) {
      return next(new AppError('New password must be different from the current one', 400));
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
    await user.save();

    await RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true });
    const { accessToken, refreshToken } = await issueTokenPair(user._id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

async function logoutAll(req, res, next) {
  try {
    await RefreshToken.updateMany({ userId: req.user.id, revoked: false }, { revoked: true });
    const { maxAge, ...clearCookieOptions } = REFRESH_COOKIE_OPTIONS;
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
