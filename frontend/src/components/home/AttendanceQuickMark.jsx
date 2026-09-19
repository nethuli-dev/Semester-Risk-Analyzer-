import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { localToday } from '../../utils/dates';

const OPTIONS = [
  { status: 'present', label: 'Present', hover: 'hover:border-emerald-600 hover:bg-emerald-600' },
  { status: 'late', label: 'Late', hover: 'hover:border-amber-500 hover:bg-amber-500' },
  { status: 'absent', label: 'Absent', hover: 'hover:border-red-600 hover:bg-red-600' },
];

function CourseRow({ course, todayRecord, isLoading }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status) => client.post(`/courses/${course._id}/attendance`, { date: localToday(), status }),
    onSettled: () => {
      // Also runs on 409 (already logged from another tab): refetch shows the truth.
      queryClient.invalidateQueries({ queryKey: ['attendance', course._id] });
      queryClient.invalidateQueries({ queryKey: ['risk'] });
    },
  });

  return (
    <li className="py-3">
      <p className="truncate text-sm font-medium text-slate-900">{course.courseName}</p>
      {todayRecord ? (
        <p className="mt-1 text-xs text-slate-600">
          Logged today as <span className="font-medium capitalize">{todayRecord.status}</span>. To change it, edit the
          record in the course's attendance tab.
        </p>
      ) : (
        <div className="mt-2 flex gap-2" role="group" aria-label={`Mark ${course.courseName} attendance for today`}>
          {OPTIONS.map((o) => (
            <button
              key={o.status}
              type="button"
              disabled={isLoading || mutation.isPending}
              onClick={() => mutation.mutate(o.status)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 border-slate-300 text-slate-700 hover:text-white ${o.hover} focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {mutation.isError && mutation.error?.response?.status !== 409 && (
        <p className="mt-1 text-xs text-red-600">{mutation.error?.response?.data?.error ?? 'Could not save.'}</p>
      )}
    </li>
  );
}

export default function AttendanceQuickMark({ courses }) {
  const today = localToday();
  const queries = useQueries({
    queries: courses.map((c) => ({
      queryKey: ['attendance', c._id],
      queryFn: async () => (await client.get(`/courses/${c._id}/attendance`)).data,
    })),
  });

  if (courses.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">Class today?</h2>
      <p className="text-xs text-slate-500">
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}. One tap logs it.
      </p>
      <ul className="mt-2 divide-y divide-slate-100">
        {courses.map((course, i) => {
          const records = queries[i].data ?? [];
          const todayRecord = records.find((r) => String(r.date).slice(0, 10) === today);
          return <CourseRow key={course._id} course={course} todayRecord={todayRecord} isLoading={queries[i].isLoading} />;
        })}
      </ul>
    </section>
  );
}
