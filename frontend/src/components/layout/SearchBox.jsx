import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';

const PAGES = [
  { label: 'Home', to: '/home' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Courses', to: '/courses' },
  { label: 'Ask AI', to: '/ask' },
  { label: 'Reports', to: '/reports' },
  { label: 'Profile', to: '/profile' },
];

// Jump-to search: pages and the student's own courses, with "Ask AI" as the
// last resort so any typed question is one Enter away from an answer.
export default function SearchBox() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await client.get('/courses')).data,
  });

  const results = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const matchedPages = PAGES.filter((p) => p.label.toLowerCase().includes(q)).map((p) => ({
      key: p.to,
      title: p.label,
      hint: 'Page',
      to: p.to,
    }));
    const matchedCourses = (courses ?? [])
      .filter((c) => `${c.courseName} ${c.courseCode}`.toLowerCase().includes(q))
      .map((c) => ({ key: c._id, title: c.courseName, hint: `${c.courseCode} · ${c.term}`, to: `/courses/${c._id}` }));
    return [
      ...matchedCourses,
      ...matchedPages,
      { key: 'ask', title: `Ask AI: “${text.trim()}”`, hint: 'Question', to: `/ask?q=${encodeURIComponent(text.trim())}` },
    ];
  }, [text, courses]);

  useEffect(() => {
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function go(result) {
    navigate(result.to);
    setText('');
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  }

  return (
    <div className="relative w-full max-w-xs" ref={wrapRef}>
      <input
        type="search"
        aria-label="Search pages and courses"
        placeholder="Search courses and pages..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-indigo-50' : ''}`}
              >
                <span className="truncate text-slate-900">{r.title}</span>
                <span className="shrink-0 text-xs text-slate-500">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
