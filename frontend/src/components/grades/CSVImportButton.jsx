import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { invalidateRiskData } from '../../utils/invalidate';

const KINDS = {
  grades: {
    columns: 'category, title, score, maxScore, date',
    template: '/templates/grades-template.csv',
    hint: 'Category must be one of this course\'s grading categories (any letter case). Dates as YYYY-MM-DD.',
  },
  attendance: {
    columns: 'date, status',
    template: '/templates/attendance-template.csv',
    hint: 'Status is present, late, absent or excused. One row per class day. Dates as YYYY-MM-DD.',
  },
};

export default function CSVImportButton({ courseId, kind = 'grades' }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const config = KINDS[kind];

  const importMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return client.post(`/courses/${courseId}/${kind}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: ({ data }) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: [kind, courseId] });
      invalidateRiskData(queryClient);
    },
    onError: (err) => setRequestError(err.response?.data?.error ?? 'Could not import this file.'),
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setRequestError(null);
    importMutation.mutate(file);
    e.target.value = '';
  }

  return (
    <div className="text-right">
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      <div className="flex items-center justify-end gap-3">
        <a href={config.template} download className="text-xs text-indigo-600 hover:underline">
          Download template
        </a>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importMutation.isPending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {importMutation.isPending ? 'Importing...' : 'Import CSV'}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Columns: <code>{config.columns}</code>
      </p>

      {requestError && (
        <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-left text-sm text-red-700">
          {requestError}
        </p>
      )}
      {result && (
        <div role="status" className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-left text-sm">
          <p>
            Imported <strong>{result.imported}</strong>, failed <strong>{result.failed}</strong>.
          </p>
          {result.errors.length > 0 && (
            <>
              <ul className="mt-1 list-disc pl-5 text-red-600">
                {result.errors.map((e) => (
                  <li key={`${e.row}-${e.message}`}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">{config.hint}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
