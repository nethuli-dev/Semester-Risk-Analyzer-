// Local calendar date as YYYY-MM-DD. Attendance dates are stored as the
// date the student typed (UTC midnight of that string), so "today" must be
// the student's LOCAL date, not toISOString() (which flips at UTC midnight).
export function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
