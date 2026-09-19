import { useState } from 'react';
import ChartDisplay from './ChartDisplay';

const CHART_TYPES = [
  { type: 'bar', label: 'Bar' },
  { type: 'line', label: 'Line' },
  { type: 'donut', label: 'Donut' },
];

function formatCell(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(2);
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function DataTable({ rows }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">The query ran but matched no records.</p>;
  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            {columns.map((c) => (
              <th key={c} className="py-1.5 pr-4 font-medium">
                {c === '_id' ? 'group' : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {columns.map((c) => (
                <td key={c} className="py-1.5 pr-4 text-slate-800">
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// One answer, three views of the same result: the chart, the raw rows, and
// the exact pipeline that produced them — so a student (or an interviewer)
// can check the answer instead of trusting it.
export default function AnswerCard({ answer, onAskAgain }) {
  const { answer: text, chartConfig, generatedPipeline } = answer;
  const rows = Array.isArray(chartConfig?.data) ? chartConfig.data : [];
  const canChart = rows.length > 0 && chartConfig?.type && chartConfig.type !== 'none';

  const [tab, setTab] = useState(canChart ? 'chart' : 'data');
  const [chartType, setChartType] = useState(canChart && chartConfig.type !== 'scatter' ? chartConfig.type : 'bar');
  const [copied, setCopied] = useState(false);

  const forcedStage = generatedPipeline?.[0];
  const tabs = [
    ...(canChart ? [{ id: 'chart', label: 'Chart' }] : []),
    { id: 'data', label: `Data (${rows.length})` },
    { id: 'pipeline', label: 'Pipeline' },
  ];

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (permissions/insecure context); nothing useful to do.
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm leading-relaxed text-slate-800">{text}</p>

      <div className="mt-4 flex items-center justify-between gap-2 border-b border-slate-100">
        <div role="tablist" className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium ${
                tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pb-1 text-xs">
          <button type="button" onClick={copyAnswer} className="text-slate-500 hover:text-indigo-600">
            {copied ? 'Copied' : 'Copy answer'}
          </button>
          {onAskAgain && (
            <button type="button" onClick={onAskAgain} className="text-slate-500 hover:text-indigo-600">
              Ask again
            </button>
          )}
        </div>
      </div>

      <div className="pt-4" role="tabpanel">
        {tab === 'chart' && canChart && (
          <>
            <div className="mb-2 flex gap-1.5" role="group" aria-label="Chart type">
              {CHART_TYPES.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  aria-pressed={chartType === c.type}
                  onClick={() => setChartType(c.type)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    chartType === c.type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <ChartDisplay chartConfig={chartConfig} typeOverride={chartType} />
          </>
        )}
        {tab === 'data' && <DataTable rows={rows} />}
        {tab === 'pipeline' && (
          <div className="space-y-2">
            {forcedStage && (
              <p className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                Stage 0 was added by the server, not the AI. It limits every query to your records:{' '}
                <code className="font-mono">{JSON.stringify(forcedStage)}</code>
              </p>
            )}
            <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(generatedPipeline, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
