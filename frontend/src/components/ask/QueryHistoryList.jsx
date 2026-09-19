const STATUS_STYLES = {
  valid: 'bg-emerald-100 text-emerald-800',
  invalid_retried: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  valid: 'answered',
  invalid_retried: 'retried',
  failed: 'rejected',
};

export default function QueryHistoryList({ queries, onOpen }) {
  if (queries.length === 0) {
    return <p className="text-sm text-slate-500">Your past questions will show up here.</p>;
  }

  return (
    <ul className="space-y-2">
      {queries.map((q) => (
        <li key={q._id}>
          <button
            type="button"
            onClick={() => onOpen(q)}
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-sm font-medium text-slate-900">{q.question}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[q.validationStatus] ?? ''}`}>
                {STATUS_LABELS[q.validationStatus] ?? q.validationStatus}
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">{new Date(q.createdAt).toLocaleString()}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
