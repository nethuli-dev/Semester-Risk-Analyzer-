import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/courses', label: 'Courses', icon: '📚' },
  { to: '/ask', label: 'Ask AI', icon: '💬' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

// Below the lg breakpoint the sidebar is an off-canvas drawer opened from the
// top bar's menu button; from lg up it is the usual fixed column.
export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="no-print fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-start justify-between px-5 py-5">
          <span className="font-display text-lg font-bold leading-tight text-white">Semester Risk Analyzer</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="ml-2 text-slate-400 hover:text-white lg:hidden">
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
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
    </>
  );
}
