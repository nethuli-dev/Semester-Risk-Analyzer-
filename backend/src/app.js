const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const { byIdRouter: gradeByIdRoutes } = require('./routes/gradeRoutes');
const riskRoutes = require('./routes/riskRoutes');
const queryRoutes = require('./routes/queryRoutes');
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
app.use('/api/courses', authMiddleware, courseRoutes);
app.use('/api/grades', authMiddleware, gradeByIdRoutes);
app.use('/api/risk', authMiddleware, riskRoutes);
app.use('/api', authMiddleware, queryRoutes);

app.use(errorHandler);

module.exports = app;
