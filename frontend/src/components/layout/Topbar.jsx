import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Topbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <input
        type="search"
        placeholder="Search..."
        className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
        >
          {initial}
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            <div className="border-b border-slate-100 px-4 py-2 text-sm text-slate-600">{user?.email}</div>
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
