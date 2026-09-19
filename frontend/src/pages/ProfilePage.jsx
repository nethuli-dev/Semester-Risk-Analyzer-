import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Notice({ tone, children }) {
  const styles = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

function DetailsForm({ user }) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user.name ?? '');
  const [university, setUniversity] = useState(user.university ?? '');
  const [program, setProgram] = useState(user.program ?? '');
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      await updateProfile({ name, university, program });
      setNotice({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setNotice({ tone: 'error', text: err.response?.data?.error ?? 'Could not save your profile.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">Your details</h2>
      <Field label="Name">
        <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Email" hint="Your email is your login, so it can't be changed here.">
        <input value={user.email} disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="University">
          <input maxLength={150} value={university} onChange={(e) => setUniversity(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Program">
          <input maxLength={150} value={program} onChange={(e) => setProgram(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setNotice(null);
    if (next !== confirm) {
      setNotice({ tone: 'error', text: "The new passwords don't match." });
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setNotice({ tone: 'success', text: 'Password changed. Any other devices have been signed out.' });
    } catch (err) {
      setNotice({ tone: 'error', text: err.response?.data?.error ?? 'Could not change your password.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">Change password</h2>
      <Field label="Current password">
        <input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" hint="At least 8 characters.">
          <input type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Confirm new password">
          <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <Button type="submit" disabled={saving}>
        {saving ? 'Changing...' : 'Change password'}
      </Button>
    </form>
  );
}

function SessionsCard() {
  const { logout, logoutEverywhere } = useAuth();
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">Sessions</h2>
      <p className="mt-1 text-sm text-slate-600">
        Signing out everywhere ends every session on every device, including this one.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
        {confirming ? (
          <>
            <Button variant="danger" onClick={logoutEverywhere}>
              Yes, sign out everywhere
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Sign out everywhere
          </Button>
        )}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: async () => (await client.get('/courses')).data });
  const { data: queries } = useQuery({ queryKey: ['queryHistory'], queryFn: async () => (await client.get('/queries')).data });

  if (!user) return null;

  const terms = new Set((courses ?? []).map((c) => c.term));
  const stats = [
    { label: 'Courses', value: (courses ?? []).length },
    { label: 'Terms', value: terms.size },
    { label: 'Questions asked', value: (queries ?? []).length },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-display text-2xl font-bold text-white">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="truncate text-sm text-slate-600">{user.email}</p>
          {user.createdAt && (
            <p className="text-xs text-slate-500">
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dd className="font-display text-2xl font-bold text-slate-900">{s.value}</dd>
            <dt className="text-xs text-slate-500">{s.label}</dt>
          </div>
        ))}
      </dl>

      <DetailsForm user={user} />
      <PasswordForm />
      <SessionsCard />
    </div>
  );
}
