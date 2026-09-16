import ReactMarkdown from 'react-markdown';
import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

export default function ReportViewer({ report }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2">
        {report.riskSummary.map((c) => (
          <span
            key={c.courseId}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: RISK_COLORS[c.riskLevel] }}
          >
            {c.courseName} · {RISK_LABELS[c.riskLevel]}
          </span>
        ))}
      </div>

      <div className="prose prose-sm prose-slate max-w-none">
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Generated {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
