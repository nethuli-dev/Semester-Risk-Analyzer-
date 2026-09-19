import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';
import { CATEGORICAL_COLORS } from '../../theme/categoricalColors';
import MeterBar from './MeterBar';

function TrendChart({ history }) {
  // The API returns newest first; the chart reads left to right.
  const points = [...(history ?? [])]
    .sort((a, b) => new Date(a.computedAt) - new Date(b.computedAt))
    .slice(-30)
    .map((h) => ({
      score: h.riskScore,
      when: new Date(h.computedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    }));

  if (points.length < 2) {
    return <p className="text-sm text-slate-500">The risk trend appears after your score has been checked a few times.</p>;
  }
  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#e1e0d9" strokeDasharray="3 3" />
          <XAxis dataKey="when" hide />
          <YAxis domain={[0, 100]} tick={{ fill: '#898781', fontSize: 11 }} />
          <Tooltip formatter={(v) => [v, 'Risk score']} />
          <Line type="monotone" dataKey="score" stroke={CATEGORICAL_COLORS[0]} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CourseReportCard({ result, history, expanded, onToggle }) {
  const { course, riskLevel, riskScore, trajectoryGrade, attendanceRate, factors, categoryBreakdown, recommendation } = result;
  const color = RISK_COLORS[riskLevel];
  const panelId = `course-panel-${course._id}`;

  return (
    <article className="print-avoid-break overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" style={{ borderLeft: `6px solid ${color}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
      >
        <span className="min-w-0">
          <span className="font-display block truncate text-lg font-bold text-slate-900">{course.courseName}</span>
          <span className="text-xs text-slate-500">
            {course.courseCode} · {course.credits} credits
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: color }}>
            {RISK_LABELS[riskLevel]} · {riskScore}
          </span>
          <span aria-hidden className="no-print text-slate-400">
            {expanded ? '▴' : '▾'}
          </span>
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-5 border-t border-slate-100 px-5 py-4">
          <p className="text-sm text-slate-700">{recommendation}</p>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-600">
                  <span>Grade trajectory</span>
                  <span>
                    {trajectoryGrade === null ? 'no grades yet' : `${trajectoryGrade}%`}
                    {course.targetGrade ? ` · target ${course.targetGrade}%` : ''}
                  </span>
                </div>
                <MeterBar value={trajectoryGrade} target={course.targetGrade} color={color} label="Grade trajectory" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-600">
                  <span>Attendance</span>
                  <span>{attendanceRate === null ? 'nothing logged yet' : `${attendanceRate}%`}</span>
                </div>
                <MeterBar value={attendanceRate} color={CATEGORICAL_COLORS[2]} label="Attendance" />
              </div>

              <div>
                <h3 className="mb-1.5 text-xs font-medium text-slate-500">What is driving this score</h3>
                {factors.length === 0 ? (
                  <p className="text-sm text-slate-500">Nothing is pulling this score up.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {factors.map((f) => (
                      <li key={f.name} className="flex justify-between gap-3">
                        <span>
                          {f.name}
                          {f.informational && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">not in score</span>}
                        </span>
                        <span className="tabular-nums text-slate-500">{f.contribution}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-1.5 text-xs font-medium text-slate-500">Grades by category</h3>
              <ul className="space-y-3">
                {categoryBreakdown.map((c) => (
                  <li key={c.category}>
                    <div className="mb-1 flex justify-between text-xs text-slate-600">
                      <span>
                        {c.category} <span className="text-slate-400">({c.weight}% of grade)</span>
                      </span>
                      <span>{c.averagePercent === null ? 'not graded yet' : `${c.averagePercent}%`}</span>
                    </div>
                    <MeterBar value={c.averagePercent} color={CATEGORICAL_COLORS[0]} label={c.category} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="print-avoid-break">
            <h3 className="mb-1.5 text-xs font-medium text-slate-500">Risk score over time</h3>
            <TrendChart history={history} />
          </div>
        </div>
      )}
    </article>
  );
}
