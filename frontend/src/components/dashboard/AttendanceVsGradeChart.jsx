import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, ResponsiveContainer } from 'recharts';
import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

const RISK_LEVELS = ['on-track', 'at-risk', 'failing'];

export default function AttendanceVsGradeChart({ riskResults }) {
  const points = riskResults.filter((r) => r.trajectoryGrade !== null && r.attendanceRate !== null);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-500">Attendance vs. grade trajectory</h2>
        <div className="flex gap-3 text-xs text-slate-600">
          {RISK_LEVELS.map((level) => (
            <span key={level} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
              {RISK_LABELS[level]}
            </span>
          ))}
        </div>
      </div>
      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Not enough logged grades and attendance yet to plot this.
        </p>
      ) : (
        <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="#e1e0d9" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="attendanceRate"
            name="Attendance"
            unit="%"
            domain={[0, 100]}
            tick={{ fill: '#898781', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="trajectoryGrade"
            name="Grade trajectory"
            unit="%"
            domain={[0, 100]}
            tick={{ fill: '#898781', fontSize: 12 }}
          />
          <ZAxis range={[80, 80]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value, name) => [`${value}%`, name]}
            labelFormatter={() => ''}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload;
              return (
                <div className="rounded-md border border-slate-200 bg-white p-2 text-xs shadow">
                  <p className="font-medium text-slate-900">{point.course.courseName}</p>
                  <p className="text-slate-600">Attendance: {point.attendanceRate}%</p>
                  <p className="text-slate-600">Grade trajectory: {point.trajectoryGrade}%</p>
                </div>
              );
            }}
          />
          {RISK_LEVELS.map((level) => (
            <Scatter
              key={level}
              name={RISK_LABELS[level]}
              data={points.filter((p) => p.riskLevel === level)}
              fill={RISK_COLORS[level]}
            />
          ))}
        </ScatterChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
