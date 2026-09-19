// A 0–100 bar with an optional target tick. Values come from the risk
// engine; this component only draws them.
export default function MeterBar({ value, target, color, label }) {
  return (
    <div
      className="relative h-2.5 rounded-full bg-slate-100"
      role="img"
      aria-label={`${label}: ${value === null ? 'no data' : `${value}%`}${target ? `, target ${target}%` : ''}`}
    >
      {value !== null && (
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, value))}%`, backgroundColor: color }} />
      )}
      {target ? (
        <div className="absolute -top-1 h-4.5 w-0.5 bg-slate-700" style={{ left: `${Math.min(100, target)}%` }} title={`Target ${target}%`} />
      ) : null}
    </div>
  );
}
