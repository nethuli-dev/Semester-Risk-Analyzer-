# Semester Risk Analyzer

A full-stack web app that helps students see which courses are slipping **before** the final exam. Log grades and attendance, and the app computes a transparent risk score per course, charts it on a dashboard, answers plain-English questions about your data with an LLM, and writes a shareable semester report.

> Built as a portfolio project. The interesting parts are the **authentication flow**, the **per-user data isolation**, and the **pipeline validator** that makes it safe to run LLM-generated database queries.

## Features

| Area | What it does |
| --- | --- |
| **Home** | A "needs your attention first" card, one-tap attendance for today, and each course's standing against your target grade. |
| **Dashboard** | Semester overview donut, highest-risk gauge, best/at-risk course lists, attendance-vs-grade scatter. |
| **Courses** | Course CRUD with a weighted grading scheme (validated to be sensible server-side), grade entry, attendance log, partial-success CSV import. |
| **Ask AI** | Ask "Which course has my lowest average?" in plain English. Each answer has Chart / Data / Pipeline tabs so you can inspect exactly how it was found. |
| **Reports** | Live KPIs, expandable per-course cards (risk trend, category breakdown, score factors), an AI-written summary, and Download PDF / Markdown. |
| **Profile** | Edit details, change password (revokes other sessions), sign out of all devices. |

## How the risk score works

The risk engine (`backend/src/services/riskEngine.js`) is a set of **pure functions with no database access**, so every number is unit-tested against hand-computed cases.

- **Trajectory grade** — weighted average over only the categories graded so far (an empty "Final" doesn't drag the score toward zero).
- **Attendance rate** — `present` and `late` count as attended; `excused` absences are removed from the denominator.
- **Risk score** = `(100 − trajectory grade)` + a penalty of `0.5 × (75 − attendance%)` when attendance is below 75%, clamped to 0–100.
- **Level** — `failing` under 60% trajectory, `at-risk` under 75% trajectory or attendance, otherwise `on-track`.
- "Below target grade" is shown as an *informational* factor and is **not** part of the score.

Worked example: grades averaging 50% and 2 of 6 classes attended → `50 + 0.5 × (75 − 33.33) = 70.83`, level `failing`.

## Security model

- **Auth:** short-lived JWT access token (15 min, held in memory only) plus a 30-day refresh token in an `httpOnly`, `SameSite=Strict` cookie. Only a **SHA-256 hash** of each refresh token is stored. Passwords use bcrypt (cost 12).
- **Session control:** logout revokes one session; changing your password or "sign out everywhere" revokes all refresh tokens.
- **Data isolation:** every protected route takes identity from the verified JWT (`req.user.id`), never from the request body. Every lookup is scoped by `{ _id, userId }`, and cross-user access returns `404`, not `403`, so IDs can't be probed.
- **Input handling:** strict Zod schemas reject unknown fields (a smuggled `userId` or `email` is a `400`), `express-mongo-sanitize` blocks operator injection, and login / change-password / LLM endpoints are rate limited.
- **LLM safety — the pipeline validator** (`backend/src/services/pipelineValidator.js`): the model never talks to the database directly. Its generated MongoDB aggregation must pass a validator first:
  - a stage allowlist (no `$out`, `$merge`, `$lookup`, …) and a fail-closed operator allowlist, checked recursively;
  - every field checked against a hard-coded schema, tracking fields created by `$group` / `$project`;
  - size and depth limits;
  - the server **always prepends its own `{ $match: { userId } }` as stage 0**, even if the LLM scoped to someone else;
  - the only execution path is a read-only `.aggregate()` call.

  The Pipeline tab in Ask AI shows this forced first stage.
- **Reports** are narrated by the LLM from numbers the risk engine already computed; the prompt forbids inventing or recalculating figures.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, Recharts, react-markdown
- **Backend:** Node.js, Express 4, Mongoose, Zod, JWT, bcrypt, helmet, express-rate-limit
- **Database:** MongoDB (Atlas)
- **LLM:** Google Gemini via `@google/genai` (free tier). The provider is swappable because safety comes from the validator, not the model.
- **Tests:** Jest + Supertest

## Getting started

**Prerequisites:** Node.js (developed and tested on v24), a MongoDB Atlas cluster (or any MongoDB URI), and a free [Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/nethuli-dev/Semester-Risk-Analyzer-.git
cd Semester-Risk-Analyzer-
```

**Backend**

```bash
cd backend
cp .env.example .env      # then fill in the values below
npm install
npm run dev               # http://localhost:5050
```

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Two different long random strings (e.g. `openssl rand -hex 48`) |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | Defaults `15m` / `30d` |
| `GEMINI_API_KEY` | Powers Ask AI and report writing |
| `FRONTEND_ORIGIN` | CORS origin, default `http://localhost:5173` |
| `PORT` | Default `5050` (not 5000, which macOS AirPlay Receiver uses) |

**Frontend**

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5050/api
npm install
npm run dev               # http://localhost:5173
```

Register an account on the login screen, add a course, log a few grades, and open Home.

## Running the tests

```bash
cd backend
npm test
```

Tests run serially against a **separate database** (`semester-risk-analyzer-test`) on the same cluster and drop it afterwards, so they never touch your dev data. Coverage: risk engine (hand-computed cases), pipeline validator (including malicious pipelines: missing user scoping, `$out`, unknown fields), real-DB pipeline execution, auth flow, profile / password / session revocation, and course CRUD with a cross-user isolation test.

## API overview

All routes except register / login / refresh require `Authorization: Bearer <access token>`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all` | Sessions |
| GET / PATCH | `/api/auth/me` | Read / update profile |
| POST | `/api/auth/change-password` | Verify current password, revoke other sessions |
| GET / POST | `/api/courses` | List / create courses |
| PUT / DELETE | `/api/courses/:id` | Update / delete (cascades grades and attendance) |
| GET / POST | `/api/courses/:id/grades` | List / add grade entries |
| POST | `/api/courses/:id/grades/import` | CSV import with per-row results |
| PUT / DELETE | `/api/grades/:id` | Update / delete a grade entry |
| GET / POST | `/api/courses/:id/attendance` | List / log attendance (one record per day) |
| GET | `/api/risk` | Fresh risk assessment for every course |
| GET | `/api/risk/:courseId/history` | Risk score over time |
| POST | `/api/query` | Ask a question in plain English |
| GET | `/api/queries` | Question history |
| POST | `/api/reports/generate` | Generate or regenerate a term report |
| GET | `/api/reports/:term` | Fetch a stored report |

## Project structure

```
backend/
  src/
    config/        constants (every threshold is a named constant), db
    controllers/   auth, courses, grades, attendance, risk, query, report
    middleware/    auth, validation, rate limiters, error handler
    models/        User, RefreshToken, Course, GradeEntry, AttendanceRecord, RiskAssessment, Query, Report
    routes/
    services/      riskEngine, pipelineValidator, pipelineGenerator, reportGenerator, csvImporter
  tests/
frontend/
  src/
    pages/         Home, Dashboard, Courses, CourseDetail, AskAI, Reports, Profile, Login, Register
    components/    home, dashboard, ask, reports, courses, grades, attendance, layout, common
    context/       AuthContext
    api/           axios client with single-flight token refresh
PROJECT_PLAN.md    architecture, schema, API design
```

## Known limitations

- **Not deployed yet.** The testing / polish / deployment phase is still open.
- **No automated frontend tests.** The frontend has been checked with production builds and manual use only.
- **Download PDF** uses the browser's Save-as-PDF (print layout) rather than generating a file directly.
- Ask AI answers one collection at a time (no joins), so the LLM can't relate two collections in a single question.
- Access tokens already issued stay valid until they expire (≤ 15 min) after a password change or revoke, the usual trade-off of stateless JWTs.
- Each `GET /api/risk` stores a new risk point for the trend chart, so heavy page-hopping adds near-duplicate points.

## Documentation

- [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — architecture, data model, API design
- [`CLAUDE.md`](CLAUDE.md) — build rules and per-phase progress log

## License

[MIT](LICENSE) © 2026 nethuli-dev
