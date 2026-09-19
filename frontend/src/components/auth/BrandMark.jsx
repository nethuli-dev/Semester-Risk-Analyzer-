import { BRAND } from '../../config/brand';

// Three rising bars with a target line: "progress toward a goal".
function Glyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <rect x="4" y="13" width="3.5" height="7" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="10.25" y="9" width="3.5" height="11" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="16.5" y="4" width="3.5" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function BrandMark({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
        <Glyph />
      </span>
      <span className="leading-tight">
        <span className="font-display block text-lg font-bold text-white">{BRAND.name}</span>
        <span className="block text-[11px] font-medium tracking-[0.14em] text-indigo-200/90 uppercase">{BRAND.tagline}</span>
      </span>
    </div>
  );
}
