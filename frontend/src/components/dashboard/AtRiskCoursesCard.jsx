import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

export default function AtRiskCoursesCard({ riskResults }) {
  const atRisk = riskResults
    .filter((r) => r.riskLevel !== 'on-track')
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-medium text-slate-500">Needs attention</h2>
      {atRisk.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">Nothing at risk right now.</p>
      ) : (
        <ul className="space-y-3">
          {atRisk.map(({ course, riskLevel, recommendation }) => (
            <li key={course._id} className="border-l-2 pl-3" style={{ borderColor: RISK_COLORS[riskLevel] }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{course.courseName}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: RISK_COLORS[riskLevel] }}
                >
                  {RISK_LABELS[riskLevel]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{recommendation}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
