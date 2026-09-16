export default function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
    </div>
  );
}
