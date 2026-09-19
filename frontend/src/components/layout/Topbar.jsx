import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SearchBox from './SearchBox';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  // Close on outside click or Escape, like any menu people expect to behave.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="no-print flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 lg:hidden"
        >
          ☰
        </button>
        <SearchBox />
      </div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        >
          {initial}
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500" title={user?.email}>
                {user?.email}
              </p>
            </div>
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Profile and settings
            </Link>
            <button
              type="button"
              onClick={logout}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
