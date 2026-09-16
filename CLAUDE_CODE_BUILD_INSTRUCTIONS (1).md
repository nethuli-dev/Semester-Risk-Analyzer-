# CLAUDE_CODE_BUILD_INSTRUCTIONS.md — Semester Risk Analyzer

Companion file: `PROJECT_PLAN.md` (read that first — it has the full architecture, schema, and rationale referenced below).

**How to work through this file:** Build one phase at a time, in order. After finishing each phase, stop, summarize what you built, and explicitly ask me to review/test before moving to the next phase. Do not build ahead of the current phase even if the next step seems obvious.

---

## 1. Build Order (mirrors PROJECT_PLAN.md §12)

1. Project scaffolding + env setup
2. Phase 1 — Auth
3. Phase 2 — Core CRUD (courses, grades, attendance, CSV import)
4. Phase 3 — Risk engine + Dashboard UI
5. Phase 4 — NL Query (pipeline generation + validator) — **this is the phase to be most careful and most thorough on**
6. Phase 5 — Report generation
7. Phase 6 — Testing, polish, deploy

**Stop after every phase and wait for my go-ahead before starting the next one.**

---

## 2. Coding Standards

- **Naming:** `camelCase` for variables/functions, `PascalCase` for React components and Mongoose model names, `kebab-case` for non-component file names, `UPPER_SNAKE_CASE` for env vars and constants.
- **File organization:** one Mongoose model per file, one controller per resource, routes files only wire `router.method(path, middleware, controller)` — no business logic in route files.
- **Error handling:** every controller wraps logic in try/catch (or an `asyncHandler` wrapper) and calls `next(err)` — never `res.status(500).send(err)` inline. All errors flow through the single `errorHandler` middleware. Use the custom `AppError(message, statusCode)` class for expected errors (validation failures, not-found, auth failures) so the handler can distinguish them from unexpected crashes.
- **Comments:** comment *why*, not *what*. Every function in `pipelineValidator.js` and `riskEngine.js` needs a short docstring-style comment explaining the rule it enforces/computes — these are the files an interviewer or reviewer will read most closely.
- **No magic numbers:** risk thresholds, token expiries, rate limits, etc. go in named constants at the top of their file or in a `constants.js`, not inline.

---

## 3. Setup

**Scaffolding:**
- `backend/`: `npm init`, install `express mongoose bcrypt jsonwebtoken cookie-parser cors helmet express-rate-limit express-mongo-sanitize zod multer csv-parse @google/genai dotenv`, dev deps `nodemon jest supertest`. (Originally `@anthropic-ai/sdk` per PROJECT_PLAN.md — switched to Gemini's free tier; see that doc's §4 LLM row.)
- `frontend/`: `npm create vite@latest frontend -- --template react`, install `react-router-dom @tanstack/react-query axios recharts tailwindcss`.

**`backend/.env.example`:**
```
PORT=5000
MONGODB_URI=                  # MongoDB Atlas connection string
JWT_ACCESS_SECRET=            # long random string
JWT_REFRESH_SECRET=           # different long random string
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
GEMINI_API_KEY=
FRONTEND_ORIGIN=http://localhost:5173
```

**`frontend/.env.example`:**
```
VITE_API_URL=http://localhost:5000/api
```

**`backend/package.json` scripts:**
```json
{
  "dev": "nodemon server.js",
  "start": "node server.js",
  "test": "jest --runInBand"
}
```

---

## 4. Backend Build Instructions (Phase 1–2 order)

Build in this exact order — each layer depends on the one before it:

1. `config/db.js` — Mongoose connection, exits process on connection failure with a clear log message.
2. `utils/AppError.js`, `middleware/errorHandler.js` — get error handling working before anything else exists to error.
3. `models/User.js`, `models/RefreshToken.js` — password field marked `select: false` so it's never returned by default.
4. `utils/jwt.js` — `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`.
5. `middleware/authMiddleware.js` — reads `Authorization: Bearer`, verifies, attaches `req.user`, calls `next(new AppError('Unauthorized', 401))` on failure.
6. `controllers/authController.js` + `routes/authRoutes.js` — register, login, refresh, logout. **Refresh token is set via `res.cookie(..., {httpOnly: true, secure: true, sameSite: 'strict'})`, never returned in the JSON body.**
7. `middleware/rateLimiters.js` — apply a strict limiter to `/api/auth/login` here, before building anything else that needs rate limiting.
8. Wire `app.js`: `helmet()`, `cors({origin: process.env.FRONTEND_ORIGIN, credentials: true})`, `express.json()`, `cookie-parser()`, `express-mongo-sanitize()`, mount `authRoutes`, mount `errorHandler` **last**.
9. `server.js` — connect DB, then `app.listen`.

**Pause here. Confirm register → login → protected test route → refresh → logout all work via Postman/Thunder Client before continuing.**

10. `models/Course.js`, `models/GradeEntry.js`, `models/AttendanceRecord.js` — per schemas in PROJECT_PLAN.md §7. Every schema includes `userId` (ref `User`) as a required, indexed field.
11. `middleware/validate.js` — generic `validate(zodSchema)` middleware factory used on every POST/PUT route body.
12. `controllers/courseController.js`, `gradeController.js`, `attendanceController.js` — **every DB query must filter by `userId: req.user.id`**, sourced only from the verified JWT, never from `req.body` or `req.params`. This is non-negotiable — see §7 "things to avoid."
13. `services/csvImporter.js` — parses CSV (via `csv-parse`), maps columns to `GradeEntry` fields, validates each row before insert, returns a per-row success/failure summary rather than failing the whole import on one bad row.
14. Corresponding route files, mounted in `app.js` behind `authMiddleware`.

---

## 5. Frontend Build Instructions

Build in this order — layout first, so every later page has somewhere to render into:

1. `context/AuthContext.jsx` — holds access token in memory (not localStorage — it's short-lived and refreshed via the httpOnly cookie flow), exposes `login`, `logout`, `user`.
2. `api/client.js` — Axios instance with `withCredentials: true` (for the refresh cookie) and a response interceptor that, on a 401, calls `/auth/refresh` once and retries the original request.
3. `routes/ProtectedRoute.jsx`, top-level `App.jsx` routing skeleton.
4. `components/layout/Sidebar.jsx`, `Topbar.jsx`, `Layout.jsx` — match the reference image: dark sidebar with nav icons + labels, active-route highlight, topbar with search input and avatar menu on the right.
5. `pages/LoginPage.jsx`, `RegisterPage.jsx` — basic forms wired to `AuthContext`.
6. `pages/CoursesPage.jsx` + `CourseFormModal.jsx` — CRUD for courses, including the grading-scheme sub-form (list of `{category, weight}` rows that must sum to 100 — validate client-side before submit).
7. `pages/CourseDetailPage.jsx` with `GradesTab`/`AttendanceTab`, `GradeFormModal`, `CSVImportButton` — wire to React Query (`useQuery`/`useMutation`), invalidate the relevant query keys on successful mutations so the UI updates without a manual refetch.
8. `pages/DashboardPage.jsx` cards, built against Phase 3's `/api/risk` endpoint once it exists — don't build these against fake data and forget to rewire them later; build this step *after* the risk engine is done.
9. **Styling polish pass last** — once every page works functionally, do a dedicated pass matching spacing, colors, and card style to the reference dashboard image.

---

## 6. The Pipeline Validator — Build This Carefully (Phase 4)

This is the component most worth getting right. Build `services/pipelineValidator.js` with, at minimum, these checks, each as a separately testable function:

1. **Stage whitelist** — only allow `$match, $group, $project, $sort, $limit, $addFields, $unwind, $count, $bucket`. Reject anything else, especially `$out`, `$merge`, `$function`, `$accumulator`, `$where` (arbitrary JS execution).
2. **Forced scoping** — regardless of what stage 0 the LLM generated, the validator (not the LLM) prepends `{$match: {userId: new ObjectId(req.user.id)}}` as the actual first stage before execution. Log if the LLM's own first stage was missing or wrong — that's useful signal, not just a silent fix.
3. **Field existence** — every field referenced in `$match`/`$group`/`$project`/`$sort` must exist in the known schema for the target collection (hardcode or derive this schema map — don't trust the LLM's idea of the schema).
4. **Size/depth limit** — reject pipelines over a fixed stage count or nesting depth (prevents a runaway or adversarial pipeline).
5. **Read-only guarantee** — the pipeline only ever reaches `.aggregate()`, never `.updateMany()`/`.deleteMany()`/etc. — enforce this structurally by having the executor function's *only* capability be running an aggregation, not by trusting the pipeline content alone.
6. **Execution timeout** — pass `maxTimeMS` on the aggregate call.

`services/pipelineGenerator.js` calls Claude with the question + the target collection's schema map and few-shot examples, asking for pipeline JSON only. `controllers/queryController.js` wires: generate → validate → (if invalid: regenerate once with the validator's rejection reason as feedback → re-validate) → execute → summarize result + pick chart type via a second short Claude call → store in `queries` collection → respond.

**Write `tests/pipelineValidator.test.js` before wiring this into the live LLM call** — feed it hand-written pipelines (including ones with `$out`, missing `userId` scoping, and nonexistent fields) and confirm each is rejected for the right reason. This test file is your strongest interview artifact from the whole project — don't skip it.

---

## 7. Things to Explicitly Avoid

- **Never** trust `userId` from the request body/params for any read or write — always `req.user.id` from the verified JWT.
- **Never** execute an LLM-generated pipeline without it passing through `pipelineValidator.js` first — no "just this once, it's probably fine" shortcuts, even during manual testing.
- **Never** store the raw refresh token — only its hash, so a DB leak doesn't hand out valid sessions.
- **Never** put secrets, API keys, or the real `MONGODB_URI` in committed files — `.env` is gitignored from the first commit, not added later.
- **Don't** let `csvImporter.js` silently swallow bad rows — report which rows failed and why.
- **Don't** scope-creep into admin/multi-student views, cross-course joins, or Sinhala language support — these are explicitly out of scope for this version.
- **Don't** let the retry-on-invalid-pipeline loop run more than once — capped retry, then a clear user-facing error, matching the original project's decision.
- **Don't** build the dashboard against mocked data and treat wiring it to the real `/api/risk` endpoint as an afterthought — build it after Phase 3's backend piece exists.

---

## 8. Testing Expectations

| Area | Tool | Minimum coverage |
|---|---|---|
| Auth flow | Jest + Supertest | register → login → access protected route → refresh → logout, plus a rejected-bad-password case and a rejected-expired-token case. |
| Pipeline validator | Jest (unit, no DB needed) | One passing case per allowed stage; one rejection case per disallowed stage/pattern (`$out`, missing scoping, unknown field, oversized pipeline). |
| Risk engine | Jest (unit) | A handful of hand-computed input/output pairs (e.g., "80% attendance + these grades → this risk level") so the scoring logic is verifiably correct, not just "runs." |
| Core CRUD endpoints | Jest + Supertest | Create/read/update/delete a course and a grade entry, confirming a second user cannot read/modify the first user's data (data-isolation test — write this one explicitly). |

---

## 9. Final Checklist Before Calling This "Done"

- [ ] All 6 phases complete and reviewed
- [ ] `npm run dev` works locally for both frontend and backend with no console errors
- [ ] All env vars documented in `.env.example` (both frontend and backend), nothing sensitive committed
- [ ] Auth flow, pipeline validator, risk engine, and cross-user data-isolation tests all pass (`npm test`)
- [ ] At least one deliberately malicious/invalid NL question demoed and correctly rejected, with the rejection reason visible somewhere (logs or UI)
- [ ] Dashboard UI is responsive (test at mobile width) and visually matches the reference image's layout conventions
- [ ] README complete per PROJECT_PLAN.md §14, including the "how I stop the AI from touching data it shouldn't" section
- [ ] Deployed: frontend live on Vercel, backend live on Render, both pointed at the Atlas cluster, and the live link actually works end-to-end (register a fresh test account on the live site and run through the full flow)
