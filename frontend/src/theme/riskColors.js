// Fixed status palette (never themed/reordered) — validated for
// colorblind-safe distinction and kept visually distinct from any
// categorical series color, per the dataviz skill's status-color rules.
export const RISK_COLORS = {
  'on-track': '#0ca30c', // good
  'at-risk': '#fab219', // warning
  failing: '#d03b3b', // critical
};

export const RISK_LABELS = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  failing: 'Failing',
};
