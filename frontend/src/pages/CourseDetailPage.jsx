import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import GradesTab from '../components/grades/GradesTab';
import AttendanceTab from '../components/attendance/AttendanceTab';
import Spinner from '../components/common/Spinner';

const TABS = ['Grades', 'Attendance'];

export default function CourseDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Grades');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await client.get('/courses')).data,
  });

  const course = courses?.find((c) => c._id === id);

  if (isLoading) return <Spinner />;
  if (!course) return <p className="text-sm text-slate-500">Course not found.</p>;

  return (
    <div>
      <Link to="/courses" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
        ← Back to courses
      </Link>
      <h1 className="font-display mb-1 text-2xl font-bold text-slate-900">{course.courseName}</h1>
      <p className="mb-6 text-sm text-slate-500">
        {course.courseCode} · {course.term}
      </p>

      <div className="mb-4 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Grades' ? <GradesTab courseId={id} /> : <AttendanceTab courseId={id} />}
    </div>
  );
}
