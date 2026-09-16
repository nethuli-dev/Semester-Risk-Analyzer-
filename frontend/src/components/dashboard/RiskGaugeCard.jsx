import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

// Shows the single highest-risk course as a gauge — the one number a
// student most needs to see first.
export default function RiskGaugeCard({ topRiskResult }) {
  if (!topRiskResult) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-slate-500">Highest risk course</h2>
        <p className="py-8 text-center text-sm text-slate-500">No courses yet.</p>
      </div>
    );
  }

  const { course, riskScore, riskLevel } = topRiskResult;
  const color = RISK_COLORS[riskLevel];
  const data = [{ value: riskScore, fill: color }];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-medium text-slate-500">Highest risk course</h2>
      <div className="flex items-center gap-4">
        <RadialBarChart
          width={120}
          height={120}
          cx={60}
          cy={60}
          innerRadius={42}
          outerRadius={58}
          barSize={12}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" background={{ fill: '#e1e0d9' }} cornerRadius={6} />
          <text x={60} y={64} textAnchor="middle" className="fill-slate-900 text-xl font-semibold">
            {riskScore}
          </text>
        </RadialBarChart>
        <div>
          <p className="font-medium text-slate-900">{course.courseName}</p>
          <p className="text-sm text-slate-500">{course.courseCode}</p>
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {RISK_LABELS[riskLevel]}
          </span>
        </div>
      </div>
    </div>
  );
}
