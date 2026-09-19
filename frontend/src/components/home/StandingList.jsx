import { Link } from 'react-router-dom';
import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

// One row per course: the bar is the trajectory grade (0–100), the tick is
// the student's own target. Seeing the bar stop short of the tick is the
// whole message.
export default function StandingList({ results }) {
  if (results.length === 0) return null;
  const sorted = [...results].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">Where you stand</h2>
      <p className="mb-4 text-xs text-slate-500">Bar is your current trajectory. The tick marks your target grade.</p>
      <ul className="space-y-4">
        {sorted.map((r) => {
          const grade = r.trajectoryGrade;
          const target = r.course.targetGrade;
          return (
            <li key={r.course._id}>
              <Link to={`/courses/${r.course._id}`} className="group block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-slate-900 group-hover:text-indigo-700">
                    {r.course.courseName}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: RISK_COLORS[r.riskLevel] }}
                  >
                    {RISK_LABELS[r.riskLevel]}
                  </span>
                </div>
                <div
                  className="relative mt-2 h-2.5 rounded-full bg-slate-100"
                  role="img"
                  aria-label={`${grade === null ? 'No grades yet' : `Trajectory ${grade}%`}${target ? `, target ${target}%` : ''}`}
                >
                  {grade !== null && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, Math.min(100, grade))}%`, backgroundColor: RISK_COLORS[r.riskLevel] }}
                    />
                  )}
                  {target ? (
                    <div
                      className="absolute -top-1 h-4.5 w-0.5 bg-slate-700"
                      style={{ left: `${Math.min(100, target)}%` }}
                      title={`Target ${target}%`}
                    />
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {grade === null ? 'No grades logged yet' : `${grade}% trajectory`}
                  {target ? ` · target ${target}%` : ''}
                  {r.attendanceRate !== null ? ` · ${r.attendanceRate}% attendance` : ''}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
