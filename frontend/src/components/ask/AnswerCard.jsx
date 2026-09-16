import { useState } from 'react';
import ChartDisplay from './ChartDisplay';

export default function AnswerCard({ answer }) {
  const [showPipeline, setShowPipeline] = useState(false);

  if (!answer) return null;

  const { answer: text, chartConfig, generatedPipeline } = answer;
  const forcedStage = generatedPipeline?.[0];

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-800">{text}</p>

      <div className="mt-4 flex justify-center">
        <ChartDisplay chartConfig={chartConfig} />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowPipeline((v) => !v)}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          {showPipeline ? 'Hide' : 'Show'} generated pipeline
        </button>
        {showPipeline && (
          <div className="mt-2 space-y-2">
            {forcedStage && (
              <p className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                Stage 0 (server-forced, not from the LLM):{' '}
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
