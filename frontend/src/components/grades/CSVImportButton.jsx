import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

export default function CSVImportButton({ courseId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [result, setResult] = useState(null);

  const importMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return client.post(`/courses/${courseId}/grades/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: ({ data }) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['grades', courseId] });
    },
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    importMutation.mutate(file);
    e.target.value = '';
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importMutation.isPending}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        {importMutation.isPending ? 'Importing...' : 'Import CSV'}
      </button>

      {result && (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>
            Imported <strong>{result.imported}</strong>, failed <strong>{result.failed}</strong>.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-red-600">
              {result.errors.map((e) => (
                <li key={e.row}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
