import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/auth/BrandMark';
import HeroPreview from '../components/auth/HeroPreview';

const FEATURES = ['Risk scores', 'Ask in plain English', 'Advisor-ready reports'];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// One page for both "Sign in" and "Create account": the URL (/login or
// /register) picks the tab, so links and the back button keep working.
export default function AuthPage({ mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const isRegister = mode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error ?? (isRegister ? 'Could not create your account.' : 'Could not sign you in.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const tabClass = (active) =>
    `flex-1 border-b-2 pb-2.5 text-center text-sm font-semibold transition-colors ${
      active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
    }`;

  return (
    <div className="grid min-h-screen bg-[#f2f5f9] lg:grid-cols-[1.1fr_1fr]">
      <section className="relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-slate-950 px-6 py-8 sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_10%_-10%,rgba(99,102,241,0.55),transparent),radial-gradient(40rem_30rem_at_100%_110%,rgba(16,185,129,0.22),transparent)]"
        />
        <BrandMark />

        <div className="max-w-xl">
          <p className="mb-3 text-sm font-medium text-emerald-300">Built for university students</p>
          <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl xl:text-6xl">
            Know where you stand before the final.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            Log grades and attendance. See which courses are slipping while there is still time to fix them.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <li key={f} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Shown only when the window is tall enough to show the card whole. */}
        <div className="hidden [@media(min-width:1024px)_and_(min-height:840px)]:block">
          <HeroPreview />
        </div>
      </section>

      <main className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-2xl" />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_60px_-15px_rgba(30,41,59,0.25)] sm:p-8">
          <div role="tablist" aria-label="Account" className="mb-6 flex border-b border-slate-200">
            <Link role="tab" aria-selected={!isRegister} to="/login" className={tabClass(!isRegister)}>
              Sign in
            </Link>
            <Link role="tab" aria-selected={isRegister} to="/register" className={tabClass(isRegister)}>
              Create account
            </Link>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1 mb-5 text-sm text-slate-500">
            {isRegister ? 'It takes under a minute. Then add your first course.' : 'Sign in to see how your semester is going.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Field id="name" label="Your name">
                <input
                  id="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Nethuli Perera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label="Email address">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="password" label="Password" hint={isRegister ? 'At least 8 characters' : undefined}>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={isRegister ? 8 : undefined}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder={isRegister ? '8+ characters' : 'Your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-14`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-indigo-600"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:shadow-none"
            >
              {isSubmitting ? (isRegister ? 'Creating account...' : 'Signing in...') : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            {isRegister ? 'Already have an account? ' : 'New here? '}
            <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-indigo-600 hover:underline">
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
