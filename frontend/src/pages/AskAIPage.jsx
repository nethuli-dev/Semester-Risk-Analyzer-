import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import QuestionInput from '../components/ask/QuestionInput';
import AnswerCard from '../components/ask/AnswerCard';
import QueryHistoryList from '../components/ask/QueryHistoryList';
import Spinner from '../components/common/Spinner';

export default function AskAIPage() {
  const queryClient = useQueryClient();
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await client.get('/courses')).data,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['queryHistory'],
    queryFn: async () => (await client.get('/queries')).data,
  });

  const askMutation = useMutation({
    mutationFn: ({ question, courseId }) => client.post('/query', { question, courseId }),
    onSuccess: ({ data }) => {
      setAnswer(data);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['queryHistory'] });
    },
    onError: (err) => {
      setAnswer(null);
      setError(err.response?.data?.error ?? 'Could not answer this question.');
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Ask AI</h1>

      <QuestionInput
        courses={courses ?? []}
        isSubmitting={askMutation.isPending}
        onSubmit={(payload) => askMutation.mutate(payload)}
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <AnswerCard answer={answer} />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-slate-500">History</h2>
        {historyLoading ? <Spinner /> : <QueryHistoryList queries={history ?? []} />}
      </div>
    </div>
  );
}
