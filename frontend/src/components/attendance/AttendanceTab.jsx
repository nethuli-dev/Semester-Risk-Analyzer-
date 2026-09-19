import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import CSVImportButton from '../grades/CSVImportButton';
import { invalidateRiskData } from '../../utils/invalidate';

const STATUSES = ['present', 'absent', 'late', 'excused'];

export default function AttendanceTab({ courseId }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('present');
  const [error, setError] = useState(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance', courseId],
    queryFn: async () => (await client.get(`/courses/${courseId}/attendance`)).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => client.post(`/courses/${courseId}/attendance`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', courseId] });
      invalidateRiskData(queryClient);
      setDate('');
      setError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId) => client.delete(`/courses/${courseId}/attendance/${recordId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', courseId] });
      invalidateRiskData(queryClient);
    },
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync({ date, status });
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not log attendance');
    }
  }

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={createMutation.isPending}>
          Log
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
        <CSVImportButton courseId={courseId} kind="attendance" />
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-slate-500">No attendance logged yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record._id} className="border-b border-slate-100">
                <td className="py-2">{new Date(record.date).toLocaleDateString()}</td>
                <td className="capitalize">{record.status}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(record._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
