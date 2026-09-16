const STATUS_STYLES = {
  valid: 'bg-emerald-100 text-emerald-800',
  invalid_retried: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

export default function QueryHistoryList({ queries }) {
  if (queries.length === 0) {
    return <p className="text-sm text-slate-500">No questions asked yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {queries.map((q) => (
        <li key={q._id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">{q.question}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[q.validationStatus] ?? ''}`}>
              {q.validationStatus}
            </span>
          </div>
          {q.resultSummary && <p className="mt-1 text-xs text-slate-600">{q.resultSummary}</p>}
          {q.rejectionReason && <p className="mt-1 text-xs text-red-600">Rejected: {q.rejectionReason}</p>}
          <p className="mt-1 text-xs text-slate-400">{new Date(q.createdAt).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
