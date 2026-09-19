# How to use this file

Save this as `CLAUDE.md` in your project's root folder. Claude Code auto-loads it every
session, so these rules persist across the whole build (multiple sessions, days apart)
without you re-pasting anything.

Make sure `PROJECT_PLAN.md` and `CLAUDE_CODE_BUILD_INSTRUCTIONS.md` are sitting in the
project root before you start — this file tells Claude Code to read them first.

---

## PROMPT (this is the actual CLAUDE.md content)

You are acting as a senior full-stack engineer **and** a patient mentor guiding me through
building this project myself. I'm building this as a portfolio piece for job interviews —
your job isn't just to produce working code, it's to make sure I understand every design
decision well enough to defend it under interview questioning, especially the auth flow,
the data-isolation model, and the pipeline validator.

**Before writing a single line of code**, read `PROJECT_PLAN.md` and
`CLAUDE_CODE_BUILD_INSTRUCTIONS.md` in full. These two documents are the source of truth for
architecture, schema, API design, coding standards, and build order — don't deviate from
them without asking me first. Confirm you've read both and briefly summarize the 6 build
phases from the build-instructions doc before we begin, so I know we're aligned.

### Operating rules for the whole project

1. **One phase at a time, in the exact order in `CLAUDE_CODE_BUILD_INSTRUCTIONS.md` §1**
   (Scaffolding → Auth → Core CRUD → Risk engine + Dashboard → NL Query → Reports →
   Testing/Polish/Deploy). Never build ahead into a later phase, even if it seems small or
   convenient to bundle in. If you think two phases should merge, ask me first and explain
   why.

2. **Before each phase, give me a short concept briefing before touching code.** Explain
   what we're about to build and why it works this way — e.g. for the risk engine, don't
   just say "we compute a weighted score," walk through the actual weighting logic and why
   it's a defensible model of risk; for the pipeline validator, walk through *why* each
   check exists and what attack/failure it specifically prevents. Where it helps, sketch the
   data shape at each step (what a document looks like before/after a stage) rather than
   just describing it in prose. Keep this focused — a few paragraphs, not a lecture — and
   offer to go deeper if I ask.

3. **After each phase, give me a review, not just a "done."** Include:
   - What was actually built (files touched, key functions/endpoints)
   - The key design decision(s) made in this phase and why, tying back to the plan docs
   - How I can verify it's actually correct myself — a specific command to run, an endpoint
     to hit with what expected response, a test file to look at — not just "trust me"
   - Any real output this phase produced (a real risk score from real test data, a real
     rejected pipeline and the exact reason it was rejected, a real test-suite pass/fail
     count) — never state a result you haven't actually run and confirmed
   - What to watch out for or double-check before we move on

4. **Then stop and wait for me to explicitly say to continue.** Don't proceed to the next
   phase on your own, even if the current one seems complete.

5. **Never invent or round up a result.** If the pipeline validator's test suite doesn't
   fully pass, or the risk engine gives a score that looks wrong on a hand-checked example,
   say so plainly and explain what you'd fix — an honest "3 of 5 tests pass, here's why the
   other 2 fail" beats a claimed "all green" I can't actually back up in an interview.

6. **If something in the plan turns out to be impractical once we're actually building it**
   (a library behaves differently than expected, MongoDB aggregation does something
   unintuitive, the LLM's pipeline output needs a different validation approach than
   planned), stop, explain the problem clearly, propose 1–2 alternatives with trade-offs, and
   let me choose — don't silently deviate from `PROJECT_PLAN.md`.

7. **Ask me a clarifying question only when you're genuinely blocked** — don't interrupt for
   things you can reasonably decide yourself within the standards already set in the docs;
   state the assumption you're making instead and move on.

8. **Treat `CLAUDE_CODE_BUILD_INSTRUCTIONS.md` §7 ("Things to Explicitly Avoid") as hard
   constraints, not suggestions** — in particular: never trust a client-supplied `userId`,
   never execute an LLM-generated pipeline without it passing `pipelineValidator.js` first,
   never commit secrets, never let the CSV importer silently swallow bad rows.

9. **Phase 5 (NL Query / pipeline validator) gets extra rigor.** Build
   `tests/pipelineValidator.test.js` per §6/§8 of the build instructions **before** wiring the
   validator into the live LLM call, and show me the actual test cases — including at least
   one deliberately malicious pipeline (missing user-scoping, a `$out` stage, an unknown
   field) and the exact rejection reason — before we move on from that phase.

10. **Before deploying (end of Phase 6), walk through the final checklist in §9 of the
    build-instructions doc explicitly and confirm each item with me** rather than assuming
    it's done.

11. **At the very end of the project, run a final "interview defense" pass:** go back
    through every phase and give me a consolidated list of the questions a hiring manager
    would likely ask about this project — especially about auth/data isolation and the
    validator, per the learning-guide throughline — with the honest answer to each, grounded
    in what we actually built, not generic talking points.

Once you've confirmed you've read both docs and summarized the phases, start Phase 1.

---

## Progress Log — Phases 1–5 (as of 2026-09-16)

**Read this first when resuming.** All 6 phases have code written and committed through
Phase 5. Backend Phases 1–2 were fully verified end-to-end against the live Atlas cluster
earlier in the build. From Phase 3 onward, this machine's network could not reliably reach
Atlas (DNS resolves via a public resolver, but the TCP connection to port 27017 either
times out or gets refused — confirmed repeatedly, ruled out whitelist and DNS as causes).
**Next session priority: run `cd backend && npm test` and a full manual click-through on a
working connection, fix whatever that surfaces, then continue to Phase 6.**

**Mid-project deviation from PROJECT_PLAN.md, explicitly approved:** the LLM provider was
switched from Anthropic Claude to Google Gemini (`@google/genai`, `GEMINI_API_KEY`) during
Phase 4 — no budget for a paid Claude key, Gemini has a usable free tier. PROJECT_PLAN.md
§4 and the architecture diagrams were updated to match. This changes zero security
properties: `pipelineValidator.js` (built and tested before any LLM existed to call it) is
what actually guarantees data isolation, not which model generated the pipeline. Working
model on the current key: `gemini-3.5-flash-lite` (`gemini-2.5-flash` is deprecated for new
accounts; several `gemini-3.x` variants returned capacity/permission errors first).

### Phase 1 — Auth (JWT access/refresh)
- **Built:** `config/db.js`, `config/constants.js`, `utils/AppError.js`/`jwt.js`,
  `middleware/errorHandler.js`/`authMiddleware.js`/`rateLimiters.js`/`validate.js`,
  `models/User.js`/`RefreshToken.js`, `controllers/authController.js` (register/login/
  refresh/logout/me), `routes/authRoutes.js`.
- **Key decisions:** access token (15m) in memory only, refresh token (30d) as httpOnly
  cookie with only its hash persisted; every protected route reads identity from
  `req.user.id` (verified JWT), never from the request body.
- **Real bugs found and fixed by testing:** `express-mongo-sanitize` crashed every request
  under Express 5 (downgraded to Express 4, confirmed fixed); same-second login+refresh
  produced byte-identical JWTs (added a `jti` claim, confirmed fixed); backend's default
  port 5000 collides with macOS AirPlay Receiver (moved to 5050 in both `.env.example`s).
- **Verified:** full real end-to-end run against live Atlas — register → protected-route
  reject/accept → login wrong/right password → refresh → logout → refresh-after-logout
  reject → Mongo-injection attempt rejected → duplicate email/unknown field rejected. All
  passed with real captured output. `npm test` (Jest) has NOT been confirmed green in this
  environment due to the network issue above, though the same flow passed manually.
- **Status: code + manual verification complete. Automated `npm test` pass pending.**

### Phase 2 — Core CRUD (courses, grades, attendance, CSV import)
- **Built:** `models/Course.js`/`GradeEntry.js`/`AttendanceRecord.js`,
  `controllers/courseController.js` (+ shared `findOwnedCourseOrFail` reused by every other
  controller), `gradeController.js`, `attendanceController.js`, `services/csvImporter.js`,
  `routes/courseRoutes.js`/`gradeRoutes.js`/`attendanceRoutes.js`, `tests/courses.test.js`
  (create/read/update/delete for a course and a grade entry, CSV partial-success, duplicate-
  attendance 409, and the required cross-user data-isolation test).
- **Key decisions:** every lookup scoped by `{_id, userId}` via one shared ownership-check
  function; cross-user access returns 404 not 403; grading-scheme weights validated
  server-side (not just client-side); cascade delete on course removal; CSV import reports
  per-row success/failure (never fails the whole batch on one bad row).
- **Status: code written and self-reviewed against the plan docs. `npm test` has NOT been
  run successfully in this environment — same network blocker. No manual verification
  either (this phase came after the network broke). This is the first phase without any
  real confirmed run — verify carefully tomorrow.**

### Phase 3 — Risk engine + Dashboard
- **Built:** `services/riskEngine.js` (pure functions, zero DB dependency),
  `models/RiskAssessment.js`, `controllers/riskController.js` (`computeAndStoreRisk`,
  exported and reused by Phase 5), `routes/riskRoutes.js`, `tests/riskEngine.test.js`.
  Full frontend scaffold: Vite/React/Tailwind v4, `AuthContext`, `api/client.js`,
  `ProtectedRoute`, `Layout`/`Sidebar`/`Topbar`, Login/Register, Courses CRUD UI,
  CourseDetail with Grades/Attendance tabs + CSV import, Dashboard (donut/gauge/lists/
  scatter via Recharts, colors from the dataviz skill's validated status palette).
- **Key decisions:** trajectory grade re-normalizes to only the categories graded so far
  (doesn't dilute toward zero before the Final exists); attendance is a separate named risk
  factor (`late`=attended, `excused` removed from denominator); every threshold is a named
  constant; `RiskAssessment` is append-only (powers the trend chart).
- **Verified:** `npx jest tests/riskEngine.test.js` → **7/7 passed**, hand-computed cases,
  zero network dependency — this one is fully real. Frontend: `npm run build` succeeds
  cleanly (729 modules, no errors) — rules out syntax/import breakage. Also added
  `GET /api/auth/me` (not in the original API table — needed for silent session restore).
- **Not verified:** the dashboard actually rendering real computed risk from real logged
  data (PROJECT_PLAN's own stated "done" bar for this phase) — blocked by Atlas, and no
  browser tooling was available this session to click through visually either.
- **Status: risk engine math is provably correct. Dashboard UI has never been seen
  rendering real data — this is the top priority to check tomorrow.**

### Phase 4 — NL Query (pipeline validator + generator)
- **Built:** `services/pipelineValidator.js` (built and its 23-test suite passed BEFORE any
  LLM was wired to it — stage whitelist, forced `$match:{userId}` prepend regardless of
  LLM output, hardcoded field-existence checking with shape tracking through `$group`/
  `$project`, fail-closed operator allowlist checked recursively, size/depth limits,
  `.aggregate()`-only executor), `services/pipelineGenerator.js` (`generatePipeline` +
  `summarizeResult`, two separate prompts), `models/Query.js`,
  `controllers/queryController.js` (generate → validate → retry-once-with-feedback →
  execute → summarize → store), `routes/queryRoutes.js` (`POST /api/query`,
  `GET /api/queries` — deliberately different paths). Frontend: `AskAIPage` +
  `QuestionInput`/`AnswerCard`/`ChartDisplay`/`QueryHistoryList`.
- **Key decisions:** the validator ALWAYS prepends its own `{$match:{userId}}` as stage 0,
  even if the LLM tried to scope to a different (victim) user's id — proven by a dedicated
  test. `AnswerCard` shows the generated pipeline with the forced stage visually labeled —
  the actual interview-demo payoff.
- **Real bugs found by live-testing against Gemini, not by inspection:**
  1. A `pipeline: {type:'array', items:{type:'object'}}` response schema with no declared
     properties gave Gemini's constrained decoder nothing to emit — every stage came back
     `{}` regardless of prompting/few-shot examples. Fixed by encoding the pipeline as a
     JSON string field instead, parsed manually.
  2. The validator checked every stage's fields against the collection's ORIGINAL schema
     even after a `$group`/`$project` introduced new computed field names — a real
     generated pipeline for "which course has my lowest average score?" was wrongly
     rejected. Fixed by threading a growing `knownFields` set through validation stage by
     stage, with regression tests proving both directions.
  3. The retry loop didn't catch a malformed-JSON generation failure — it threw uncaught
     instead of using the retry. Fixed.
- **Verified:** all 23 pipeline-validator tests pass (network-independent). 5/5 real
  questions through the live Gemini API produced valid, correctly force-scoped pipelines
  after the fixes above. Frontend `npm run build` succeeds (729 modules).
- **Not verified:** actual pipeline EXECUTION against real data (the `.aggregate()` call +
  result summarization + storage) — Atlas blocked every attempt tonight, including with a
  DNS-patch workaround that got the generate/validate half working but still hit the same
  TCP-level wall on the execute half.
- **Status: the hard security-critical half (generate + validate) is thoroughly proven.
  The execute + summarize + store half is written and reviewed, never run.**

### Phase 5 — Report generation
- **Built:** `services/reportGenerator.js` (third distinct LLM call/prompt — never computes
  a number, only narrates numbers `computeAndStoreRisk` already produced),
  `services/geminiClient.js` (extracted shared client setup),
  `controllers/reportController.js` (`POST /api/reports/generate` upserts one report per
  student per term; `GET /api/reports/:term`), `routes/reportRoutes.js`. Frontend:
  `ReportsPage` (term selector derived from the student's own courses), `ReportViewer`
  (markdown via `react-markdown` + `@tailwindcss/typography`, risk badges per course),
  `RegenerateButton`.
- **Key decision:** the report generator's prompt is built entirely from numbers the risk
  engine already computed — the LLM's system instruction explicitly forbids inventing,
  estimating, or recalculating any figure.
- **Real bug found and fixed:** first draft of the report quoted factor names and
  "contributes 55" text near-verbatim instead of synthesizing natural prose. Tightened the
  prompt, re-ran the same test data, confirmed the fix (natural sentences, same accurate
  numbers, hand-checked each one).
- **Verified:** the LLM call itself, twice, against realistic fabricated risk data mirroring
  real `riskEngine.js` output — every number in the generated report matched the input
  exactly, on-track course correctly omitted from its own section as instructed.
- **Not verified:** the database-dependent half — upsert logic, term lookup, the full
  `POST /api/reports/generate` → `GET /api/reports/:term` round trip. Same network blocker.
- **Status: LLM output is proven grounded and non-hallucinatory. DB wiring is written and
  reviewed, never run.**

### What to actually do first tomorrow
1. Confirm the network switch fixed Atlas connectivity (`cd backend && node -e "require('dns').resolveSrv('_mongodb._tcp.<your-cluster-host>', e=>console.log(e?'FAIL':'OK'))"`).
2. `cd backend && npm test` — this is the first time `tests/courses.test.js`,
   `tests/auth.test.js` (DB-dependent parts), and the full suite together will have run
   successfully end to end. Report the real pass/fail count, don't assume green.
3. `npm run dev` in both `backend/` and `frontend/`, then manually click through: register →
   add a course → log grades/attendance → check Dashboard shows correct real numbers →
   ask a real question on `/ask` and confirm the pipeline + answer are correct → generate a
   report on `/reports` and sanity-check it against the Dashboard.
4. Fix whatever's actually broken (there will likely be something — none of Phases 3–5 have
   had a real DB round trip yet). Only once that's done, move to Phase 6 per CLAUDE.md rule 1.

---

## Update — 2026-09-19 (supersedes the "not verified" notes above)

Atlas connectivity is restored and the items marked unverified in Phases 2–5 have now had a real
DB round trip. `cd backend && npm test` → **59/59 passing across 6 suites**.

Bugs found by that first live run and fixed: the Ask AI forced `$match` compared a string `userId`
to an `ObjectId` (aggregate() doesn't cast, so answers were silently empty; now cast in
`queryController`, with a regression test in `tests/pipelineExecution.test.js`); the prompt now
lists exact enum values (case-sensitive matches); results map the student's own course ids to
names; "Below target grade" is flagged `informational` so factors reconcile with the score.

Added at the user's request (beyond PROJECT_PLAN): Home page, interactive Ask AI thread, interactive
Reports with PDF (print) / Markdown export, and a Profile page with change-password and
sign-out-everywhere.

Still open: Phase 6 (testing/polish/deploy, §9 checklist), frontend not yet checked in a browser by
the assistant (Chrome extension unavailable), no frontend automated tests.
