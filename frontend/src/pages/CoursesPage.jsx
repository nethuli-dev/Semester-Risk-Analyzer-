import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import CourseList from '../components/courses/CourseList';
import CourseFormModal from '../components/courses/CourseFormModal';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState(null); // null | 'create' | course object to edit

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await client.get('/courses')).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => client.post('/courses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setModalState(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => client.put(`/courses/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setModalState(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/courses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  function handleDelete(course) {
    if (window.confirm(`Delete ${course.courseName}? This also deletes its grades and attendance.`)) {
      deleteMutation.mutate(course._id);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Courses</h1>
        <Button onClick={() => setModalState('create')}>+ Add course</Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <CourseList courses={courses ?? []} onEdit={setModalState} onDelete={handleDelete} />
      )}

      {modalState === 'create' && (
        <CourseFormModal
          isSubmitting={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
          onClose={() => setModalState(null)}
        />
      )}

      {modalState && modalState !== 'create' && (
        <CourseFormModal
          initialCourse={modalState}
          isSubmitting={updateMutation.isPending}
          onSubmit={(payload) => updateMutation.mutateAsync({ id: modalState._id, payload })}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
