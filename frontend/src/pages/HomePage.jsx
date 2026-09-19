import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { greetingForNow } from '../utils/dates';
import FocusCard from '../components/home/FocusCard';
import StandingList from '../components/home/StandingList';
import AttendanceQuickMark from '../components/home/AttendanceQuickMark';
import Spinner from '../components/common/Spinner';

function summaryLine(results) {
  if (results.length === 0) return 'Nothing tracked yet.';
  const attention = results.filter((r) => r.riskLevel !== 'on-track').length;
  const tracked = `${results.length} ${results.length === 1 ? 'course' : 'courses'} tracked`;
  if (attention === 0) return `${tracked}. All on track.`;
  return `${tracked}. ${attention} ${attention === 1 ? 'needs' : 'need'} attention.`;
}

const QUICK_LINKS = [
  { to: '/dashboard', label: 'Full dashboard' },
  { to: '/courses', label: 'Manage courses' },
  { to: '/reports', label: 'Semester report' },
];

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const { data: results, isLoading } = useQuery({
    queryKey: ['risk'],
    queryFn: async () => (await client.get('/risk')).data,
  });
  const { data: recent } = useQuery({
    queryKey: ['queryHistory'],
    queryFn: async () => (await client.get('/queries')).data,
  });

  if (isLoading) return <Spinner />;

  const list = results ?? [];
  const courses = list.map((r) => r.course);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          {greetingForNow()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{summaryLine(list)}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <FocusCard results={list} />
          <StandingList results={list} />
        </div>

        <div className="space-y-5">
          <AttendanceQuickMark courses={courses} />

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-slate-900">Recent questions</h2>
            {(recent ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Nothing asked yet. Try{' '}
                <Link to="/ask" className="text-indigo-600 hover:underline">
                  Ask AI
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {(recent ?? []).slice(0, 3).map((q) => (
                  <li key={q._id}>
                    <Link
                      to={`/ask?q=${encodeURIComponent(q.question)}`}
                      className="block rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="line-clamp-1 font-medium">{q.question}</span>
                      {q.resultSummary && <span className="line-clamp-1 text-xs text-slate-500">{q.resultSummary}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <nav className="flex flex-wrap gap-2" aria-label="Shortcuts">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
