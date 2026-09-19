import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/courses', label: 'Courses', icon: '📚' },
  { to: '/ask', label: 'Ask AI', icon: '💬' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  return (
    <aside className="no-print flex h-full w-56 flex-col bg-slate-900 text-slate-200">
      <div className="px-5 py-5 text-lg font-semibold text-white">Semester Risk Analyzer</div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
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
        ))}
      </nav>
    </aside>
  );
}
