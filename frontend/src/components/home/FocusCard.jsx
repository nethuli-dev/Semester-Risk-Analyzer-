import { Link } from 'react-router-dom';
import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

// Everything on this card is derived from numbers the risk engine already
// returned — no LLM, no guessing. It answers one question: "what should I
// do first?"
function pickFocus(results) {
  const needsAttention = results.filter((r) => r.riskLevel !== 'on-track');
  if (needsAttention.length > 0) {
    return { kind: 'attention', result: [...needsAttention].sort((a, b) => b.riskScore - a.riskScore)[0] };
  }
  const graded = results.filter((r) => r.trajectoryGrade !== null);
  if (graded.length > 0) {
    return { kind: 'clear', result: [...graded].sort((a, b) => b.trajectoryGrade - a.trajectoryGrade)[0] };
  }
  return { kind: 'nodata', result: results[0] };
}

function reasonsFor(result) {
  const reasons = [];
  if (result.trajectoryGrade !== null) {
    reasons.push(`Your grades are trending at ${result.trajectoryGrade}%.`);
  }
  if (result.attendanceRate !== null && result.factors.some((f) => f.name === 'Low attendance')) {
    reasons.push(`You've attended ${result.attendanceRate}% of classes.`);
  }
  const gap = result.factors.find((f) => f.name === 'Below target grade');
  if (gap && result.course.targetGrade) {
    reasons.push(`That's ${gap.contribution} points under your ${result.course.targetGrade}% target.`);
  }
  return reasons;
}

export default function FocusCard({ results }) {
  if (results.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-slate-900">Start with one course</h2>
        <p className="mt-1 max-w-prose text-sm text-slate-600">
          Add a course and its grading scheme, then log grades and attendance. Your risk score appears as soon as there
          is something to measure.
        </p>
        <Link
          to="/courses"
          className="mt-4 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add a course
        </Link>
      </section>
    );
  }

  const { kind, result } = pickFocus(results);
  const { course } = result;
  const color = kind === 'attention' ? RISK_COLORS[result.riskLevel] : RISK_COLORS['on-track'];

  const heading =
    kind === 'attention'
      ? `${course.courseName} needs your attention first`
      : kind === 'clear'
        ? 'Every course is on track'
        : `Log your first grade in ${course.courseName}`;

  const body =
    kind === 'attention'
      ? result.recommendation
      : kind === 'clear'
        ? `${course.courseName} is your strongest at ${result.trajectoryGrade}%. Keep logging grades so this stays accurate.`
        : 'Risk scores need at least one graded item. Add a grade and this card will tell you where you stand.';

  const reasons = kind === 'attention' ? reasonsFor(result) : [];
  const askText =
    kind === 'attention' ? `How is my attendance in ${course.courseName}?` : 'Which course has my lowest average score?';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" style={{ borderLeft: `6px solid ${color}` }}>
      <div className="flex flex-wrap items-center gap-2">
        {kind === 'attention' && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {RISK_LABELS[result.riskLevel]} · risk {result.riskScore}
          </span>
        )}
        <span className="text-xs text-slate-500">{course.courseCode}</span>
      </div>
      <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-slate-900">{heading}</h2>
      <p className="mt-2 max-w-prose text-sm text-slate-700">{body}</p>
      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to={`/courses/${course._id}`}
          className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Log a grade
        </Link>
        <Link
          to={`/ask?q=${encodeURIComponent(askText)}`}
          className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Ask AI about it
        </Link>
      </div>
    </section>
  );
}
