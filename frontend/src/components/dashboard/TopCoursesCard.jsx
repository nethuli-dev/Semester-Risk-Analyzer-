export default function TopCoursesCard({ riskResults }) {
  const top = [...riskResults].sort((a, b) => a.riskScore - b.riskScore).slice(0, 3);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-medium text-slate-500">Best standing</h2>
      {top.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No courses yet.</p>
      ) : (
        <ul className="space-y-2">
          {top.map(({ course, riskScore, trajectoryGrade }) => (
            <li key={course._id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{course.courseName}</span>
              <span className="font-medium text-slate-900">
                {trajectoryGrade === null ? '—' : `${trajectoryGrade}%`}
                <span className="ml-2 text-xs text-slate-400">risk {riskScore}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
