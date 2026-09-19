function mean(values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  return present.length === 0 ? null : Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
}

export default function ReportKpis({ results }) {
  const avgGrade = mean(results.map((r) => r.trajectoryGrade));
  const avgAttendance = mean(results.map((r) => r.attendanceRate));
  const attention = results.filter((r) => r.riskLevel !== 'on-track').length;

  const items = [
    { label: 'Courses', value: results.length },
    { label: 'Average grade trajectory', value: avgGrade === null ? '—' : `${avgGrade}%` },
    { label: 'Average attendance', value: avgAttendance === null ? '—' : `${avgAttendance}%` },
    { label: 'Need attention', value: attention, tone: attention > 0 ? 'text-red-700' : 'text-emerald-700' },
  ];

  return (
    <dl className="print-avoid-break grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <dd className={`font-display text-2xl font-bold ${i.tone ?? 'text-slate-900'}`}>{i.value}</dd>
          <dt className="text-xs text-slate-500">{i.label}</dt>
        </div>
      ))}
    </dl>
  );
}
