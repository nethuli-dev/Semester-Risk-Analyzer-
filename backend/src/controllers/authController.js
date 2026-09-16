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

module.exports = { register, login, refresh, logout, registerSchema, loginSchema };
