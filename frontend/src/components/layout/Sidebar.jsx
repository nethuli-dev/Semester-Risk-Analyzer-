import { NavLink } from 'react-router-dom';

// Ask AI / Reports / Profile aren't built yet (later phases) — shown as
// disabled entries so the nav shell matches the app's final information
// architecture without implying functionality that doesn't exist.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/courses', label: 'Courses', icon: '📚' },
  { label: 'Ask AI', icon: '💬', disabled: true },
  { label: 'Reports', icon: '📄', disabled: true },
  { label: 'Profile', icon: '👤', disabled: true },
];

export default function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col bg-slate-900 text-slate-200">
      <div className="px-5 py-5 text-lg font-semibold text-white">Semester Risk Analyzer</div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) =>
          item.disabled ? (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500"
              title="Coming soon"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
