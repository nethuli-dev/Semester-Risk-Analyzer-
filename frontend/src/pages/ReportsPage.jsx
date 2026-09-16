import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import ReportViewer from '../components/reports/ReportViewer';
import RegenerateButton from '../components/reports/RegenerateButton';
import Spinner from '../components/common/Spinner';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState('');
  const [error, setError] = useState(null);

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await client.get('/courses')).data,
  });

  const terms = [...new Set((courses ?? []).map((c) => c.term))];

  useEffect(() => {
    if (!term && terms.length > 0) setTerm(terms[0]);
  }, [terms, term]);

  const {
    data: report,
    isLoading: reportLoading,
    isFetching: reportFetching,
  } = useQuery({
    queryKey: ['report', term],
    queryFn: async () => (await client.get(`/reports/${term}`)).data,
    enabled: !!term,
    retry: false,
    throwOnError: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => client.post('/reports/generate', { term }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['report', term] });
    },
    onError: (err) => setError(err.response?.data?.error ?? 'Could not generate report'),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        {terms.length > 0 && (
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {terms.length === 0 ? (
        <p className="text-sm text-slate-500">Add a course before generating a semester report.</p>
      ) : (
        <>
          <div className="mb-4">
            <RegenerateButton
              hasExistingReport={!!report}
              isSubmitting={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {(reportLoading || reportFetching) && !report ? (
            <Spinner />
          ) : report ? (
            <ReportViewer report={report} />
          ) : (
            <p className="text-sm text-slate-500">
              No report generated yet for {term}. Click "Generate report" above.
            </p>
          )}
        </>
      )}
    </div>
  );
}
