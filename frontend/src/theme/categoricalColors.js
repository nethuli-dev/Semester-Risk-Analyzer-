// Fixed-order categorical palette (dataviz skill reference palette) — hues
// are assigned by this order, never cycled arbitrarily. Categories beyond
// this list fold into "Other" rather than reusing a hue.
export const CATEGORICAL_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
];

export const OTHER_COLOR = '#898781'; // muted ink, for a folded "Other" bucket

export function colorForIndex(index) {
  return index < CATEGORICAL_COLORS.length ? CATEGORICAL_COLORS[index] : OTHER_COLOR;
}
