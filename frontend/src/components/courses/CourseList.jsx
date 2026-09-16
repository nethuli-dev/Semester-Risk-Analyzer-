import { Link } from 'react-router-dom';

export default function CourseList({ courses, onEdit, onDelete }) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No courses yet. Add your first course to start tracking grades and attendance.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <div key={course._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{course.courseName}</h3>
              <p className="text-sm text-slate-500">
                {course.courseCode} · {course.term}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {course.credits} cr
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {course.gradingScheme.map((item) => (
              <span key={item.category} className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                {item.category} {item.weight}%
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to={`/courses/${course._id}`} className="text-indigo-600 hover:underline">
              View grades &amp; attendance
            </Link>
            <div className="flex gap-3">
              <button type="button" onClick={() => onEdit(course)} className="text-slate-500 hover:text-slate-700">
                Edit
              </button>
              <button type="button" onClick={() => onDelete(course)} className="text-red-500 hover:text-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
