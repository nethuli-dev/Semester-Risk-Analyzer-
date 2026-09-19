import { RISK_COLORS, RISK_LABELS } from '../../theme/riskColors';

// Illustrative sample, not real data: three courses in three different states,
// drawn the same way the app's own "Where you stand" card draws them.
const SAMPLE = [
  { name: 'Calculus II', grade: 51, target: 80, level: 'failing' },
  { name: 'Data Structures', grade: 72, target: 85, level: 'at-risk' },
  { name: 'Intro Psychology', grade: 92, target: 85, level: 'on-track' },
];

export default function HeroPreview() {
  return (
    <figure className="w-full max-w-md">
      <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <p className="mb-4 text-sm font-medium text-white">Where you stand</p>
        <ul className="space-y-4">
          {SAMPLE.map((c) => (
            <li key={c.name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/95">{c.name}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: RISK_COLORS[c.level] }}>
                  {RISK_LABELS[c.level]}
                </span>
              </div>
              <div className="relative mt-2 h-2 rounded-full bg-white/20">
                <div className="h-full rounded-full" style={{ width: `${c.grade}%`, backgroundColor: RISK_COLORS[c.level] }} />
                <div className="absolute -top-1 h-4 w-0.5 bg-white" style={{ left: `${c.target}%` }} />
              </div>
              <p className="mt-1 text-xs text-white/60">
                {c.grade}% now, target {c.target}%
              </p>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-xs text-white/50">Example data. The white tick is your target grade.</figcaption>
    </figure>
  );
}
