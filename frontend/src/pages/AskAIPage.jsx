import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import QuestionInput from '../components/ask/QuestionInput';
import AnswerCard from '../components/ask/AnswerCard';
import QueryHistoryList from '../components/ask/QueryHistoryList';
import SuggestionChips from '../components/ask/SuggestionChips';
import Spinner from '../components/common/Spinner';

function ThinkingBubble() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm" role="status">
      <span className="sr-only">Working on your question</span>
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  );
}

export default function AskAIPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get('q') ?? '';
  const [thread, setThread] = useState([]);
  const endRef = useRef(null);

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await client.get('/courses')).data,
  });
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['queryHistory'],
    queryFn: async () => (await client.get('/queries')).data,
  });

  useEffect(() => {
    if (thread.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread]);

  const isPending = thread.some((t) => t.status === 'pending');

  function patch(id, changes) {
    setThread((items) => items.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }

  async function ask({ question, courseId }) {
    if (isPending) return;
    const id = crypto.randomUUID();
    setThread((items) => [...items, { id, question, courseId, status: 'pending' }]);
    try {
      const { data } = await client.post('/query', { question, courseId });
      patch(id, { status: 'done', answer: data });
    } catch (err) {
      patch(id, { status: 'error', error: err.response?.data?.error ?? 'Could not answer this question.' });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['queryHistory'] });
    }
  }

  function openFromHistory(q) {
    const base = { id: crypto.randomUUID(), question: q.question, fromHistory: true };
    if (q.validationStatus === 'failed') {
      setThread((items) => [...items, { ...base, status: 'error', error: `Rejected: ${q.rejectionReason}` }]);
      return;
    }
    setThread((items) => [
      ...items,
      {
        ...base,
        status: 'done',
        answer: { answer: q.resultSummary, chartConfig: q.chartConfig, generatedPipeline: q.generatedPipeline },
      },
    ]);
  }

  const courseList = courses ?? [];

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex min-h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Ask AI</h1>
            <p className="text-sm text-slate-500">Ask in plain English. You can inspect exactly how each answer was found.</p>
          </div>
          {thread.length > 0 && (
            <button type="button" onClick={() => setThread([])} className="text-xs text-slate-500 hover:text-indigo-600">
              Clear conversation
            </button>
          )}
        </div>

        <div className="flex-1 space-y-4">
          {thread.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6">
              <h2 className="font-display text-lg font-bold text-slate-900">Try one of these</h2>
              <p className="mb-3 mt-0.5 text-sm text-slate-600">Tap a question to run it, or type your own below.</p>
              <SuggestionChips courses={courseList} disabled={isPending} onPick={ask} />
            </div>
          ) : (
            thread.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-sm text-white">
                    {item.question}
                  </p>
                </div>
                {item.status === 'pending' && <ThinkingBubble />}
                {item.status === 'error' && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {item.error}
                    {!item.fromHistory && (
                      <button
                        type="button"
                        onClick={() => ask({ question: item.question, courseId: item.courseId })}
                        disabled={isPending}
                        className="ml-2 font-medium underline disabled:opacity-50"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}
                {item.status === 'done' && (
                  <AnswerCard
                    answer={item.answer}
                    onAskAgain={() => ask({ question: item.question, courseId: item.courseId })}
                  />
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 -mx-1 mt-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-1 pb-1 pt-4">
          {thread.length > 0 && (
            <div className="mb-2">
              <SuggestionChips courses={courseList} disabled={isPending} onPick={ask} />
            </div>
          )}
          <QuestionInput courses={courseList} isSubmitting={isPending} onSubmit={ask} initialText={prefill} />
        </div>
      </div>

      <aside className="lg:sticky lg:top-0 lg:self-start">
        <h2 className="mb-3 text-sm font-medium text-slate-500">History</h2>
        {historyLoading ? <Spinner /> : <QueryHistoryList queries={(history ?? []).slice(0, 12)} onOpen={openFromHistory} />}
      </aside>
    </div>
  );
}
