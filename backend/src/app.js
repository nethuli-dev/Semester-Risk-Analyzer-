const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// Strips any client-supplied key starting with `$` or containing `.` from
// req.body/req.query/req.params, closing off Mongo operator injection
// (e.g. {"email": {"$ne": null}}) on top of Mongoose's own schema typing.
app.use(mongoSanitize());

app.use('/api/auth', authRoutes);

// Temporary Phase-1 verification route: proves authMiddleware correctly
// identifies the caller from a verified access token. Superseded by real
// protected resources (courses, grades, ...) in Phase 2.
app.get('/api/protected-test', authMiddleware, (req, res) => {
  res.json({ message: 'You are authenticated', userId: req.user.id });
});

app.use(errorHandler);

module.exports = app;
