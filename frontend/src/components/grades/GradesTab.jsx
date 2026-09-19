import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import GradeFormModal from './GradeFormModal';
import CSVImportButton from './CSVImportButton';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { invalidateRiskData } from '../../utils/invalidate';

export default function GradesTab({ courseId, categories = [] }) {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState(null);

  const { data: grades, isLoading } = useQuery({
    queryKey: ['grades', courseId],
    queryFn: async () => (await client.get(`/courses/${courseId}/grades`)).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['grades', courseId] });
    invalidateRiskData(queryClient);
  };

  const createMutation = useMutation({
    mutationFn: (payload) => client.post(`/courses/${courseId}/grades`, payload),
    onSuccess: () => {
      invalidate();
      setModalState(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => client.put(`/grades/${id}`, payload),
    onSuccess: () => {
      invalidate();
      setModalState(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/grades/${id}`),
    onSuccess: invalidate,
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <Button onClick={() => setModalState('create')}>+ Add grade entry</Button>
        <CSVImportButton courseId={courseId} kind="grades" />
      </div>

      {grades.length === 0 ? (
        <p className="text-sm text-slate-500">No grade entries yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Category</th>
              <th>Title</th>
              <th>Score</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade._id} className="border-b border-slate-100">
                <td className="py-2">{grade.category}</td>
                <td>{grade.title}</td>
                <td>
                  {grade.score}/{grade.maxScore}
                </td>
                <td>{new Date(grade.date).toLocaleDateString()}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => setModalState(grade)}
                    className="mr-3 text-slate-500 hover:text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(grade._id)}
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

      {modalState === 'create' && (
        <GradeFormModal
          categories={categories}
          isSubmitting={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
          onClose={() => setModalState(null)}
        />
      )}

      {modalState && modalState !== 'create' && (
        <GradeFormModal
          categories={categories}
          initialGrade={modalState}
          isSubmitting={updateMutation.isPending}
          onSubmit={(payload) => updateMutation.mutateAsync({ id: modalState._id, payload })}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
