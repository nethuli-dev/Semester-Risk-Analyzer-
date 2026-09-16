import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

const RISK_LEVELS = ['on-track', 'at-risk', 'failing'];

export default function SemesterOverviewCard({ riskResults }) {
  const counts = RISK_LEVELS.map((level) => ({
    level,
    name: RISK_LABELS[level],
    value: riskResults.filter((r) => r.riskLevel === level).length,
  }));

  const total = riskResults.length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-medium text-slate-500">Semester overview</h2>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No courses yet.</p>
      ) : (
        <div className="flex items-center gap-4">
          <PieChart width={140} height={140}>
            <Pie
              data={counts}
              dataKey="value"
              nameKey="name"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={counts.filter((c) => c.value > 0).length > 1 ? 2 : 0}
              stroke="#fcfcfb"
              strokeWidth={2}
            >
              {counts.map((c) => (
                <Cell key={c.level} fill={RISK_COLORS[c.level]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} course${value === 1 ? '' : 's'}`, name]} />
          </PieChart>
          <ul className="space-y-1.5 text-sm">
            {counts.map((c) => (
              <li key={c.level} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[c.level] }}
                />
                <span className="text-slate-700">{c.name}</span>
                <span className="ml-auto font-medium text-slate-900">{c.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
