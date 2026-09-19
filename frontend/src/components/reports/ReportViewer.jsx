import ReactMarkdown from 'react-markdown';

// The AI-written part of the report. The numbers everywhere else on the page
// come straight from the risk engine; this card only turns them into prose,
// and says so.
export default function ReportViewer({ report }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">Written summary</h2>
      <p className="mb-4 text-xs text-slate-500">
        Written by AI from the figures on this page. Generated {new Date(report.generatedAt).toLocaleString()}.
      </p>
      <div className="prose prose-sm prose-slate max-w-none">
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </div>
    </section>
  );
}
