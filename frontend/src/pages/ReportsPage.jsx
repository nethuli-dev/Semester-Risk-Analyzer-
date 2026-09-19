import { useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ReportViewer from '../components/reports/ReportViewer';
import RegenerateButton from '../components/reports/RegenerateButton';
import ReportKpis from '../components/reports/ReportKpis';
import CourseReportCard from '../components/reports/CourseReportCard';
import DownloadButtons from '../components/reports/DownloadButtons';
import Spinner from '../components/common/Spinner';
import { buildReportMarkdown, downloadTextFile, safeFilename } from '../utils/reportExport';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedTerm, setTerm] = useState('');
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [printing, setPrinting] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await client.get('/courses')).data,
  });
  const terms = [...new Set((courses ?? []).map((c) => c.term))];
  const term = selectedTerm || terms[0] || '';

  // Live numbers (risk engine), separate from the stored narrative: the
  // charts are always current, the written summary is a dated snapshot.
  const { data: riskResults, isLoading: riskLoading } = useQuery({
    queryKey: ['risk'],
    queryFn: async () => (await client.get('/risk')).data,
  });
  const results = (riskResults ?? []).filter((r) => r.course.term === term);

  const historyQueries = useQueries({
    queries: results.map((r) => ({
      queryKey: ['riskHistory', r.course._id],
      queryFn: async () => (await client.get(`/risk/${r.course._id}/history`)).data,
    })),
  });

  const { data: report, isLoading: reportLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['risk'] });
    },
    onError: (err) => setError(err.response?.data?.error ?? 'Could not generate report'),
  });

  // The stored narrative quotes the scores at the moment it was written. If
  // any live score has since moved, say so instead of letting the text and
  // the charts silently disagree.
  const narrativeIsStale =
    !!report &&
    results.length > 0 &&
    (results.length !== report.riskSummary.length ||
      results.some((r) => {
        const old = report.riskSummary.find((s) => s.courseId === r.course._id);
        return !old || Math.abs(old.riskScore - r.riskScore) > 0.01;
      }));

  const isOpen = (r) => printing || (expanded[r.course._id] ?? r.riskLevel !== 'on-track');
  const allOpen = results.length > 0 && results.every(isOpen);

  function toggleAll() {
    const next = {};
    for (const r of results) next[r.course._id] = !allOpen;
    setExpanded(next);
  }

  function downloadMarkdown() {
    const md = buildReportMarkdown({
      studentName: user?.name ?? '',
      term,
      generatedAt: report?.generatedAt,
      results,
      narrative: report?.content,
    });
    downloadTextFile(`${safeFilename('semester-report', term)}.md`, md);
  }

  // Save-as-PDF via the browser's print dialog: a real vector PDF with the
  // charts intact and no extra dependency. Expand every course first so the
  // PDF is complete, and set the tab title because browsers use it as the
  // default PDF filename.
  function downloadPdf() {
    const previousTitle = document.title;
    setPrinting(true);
    const restore = () => {
      document.title = previousTitle;
      setPrinting(false);
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => {
      document.title = safeFilename('semester-report', term, user?.name ?? '');
      window.print();
    }, 250);
  }

  return (
    <div className="print-page mx-auto max-w-3xl space-y-5">
      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-bold">Semester report: {term}</h1>
        <p className="text-sm text-slate-600">
          {user?.name} · {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">Reports</h1>
        {terms.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Term
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
          </label>
        )}
      </div>

      {terms.length === 0 ? (
        <p className="text-sm text-slate-500">Add a course before generating a semester report.</p>
      ) : riskLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <RegenerateButton
              hasExistingReport={!!report}
              isSubmitting={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            />
            <DownloadButtons onPdf={downloadPdf} onMarkdown={downloadMarkdown} disabled={results.length === 0} />
          </div>

          {error && (
            <div role="alert" className="no-print rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {narrativeIsStale && (
            <div role="status" className="no-print rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Your numbers have changed since this summary was written. The charts below are current; regenerate to
              refresh the text.
            </div>
          )}

          <ReportKpis results={results} />

          {reportLoading ? (
            <Spinner />
          ) : report ? (
            <ReportViewer report={report} />
          ) : (
            <p className="no-print rounded-xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-600">
              No written summary for {term} yet. Generate one to get a narrative you can share with an advisor. The
              figures below are already live.
            </p>
          )}

          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">Course by course</h2>
            <button type="button" onClick={toggleAll} className="no-print text-xs font-medium text-indigo-600 hover:underline">
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <div className="space-y-3">
            {results.map((r, i) => (
              <CourseReportCard
                key={r.course._id}
                result={r}
                history={historyQueries[i]?.data}
                expanded={isOpen(r)}
                onToggle={() => setExpanded((prev) => ({ ...prev, [r.course._id]: !isOpen(r) }))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
