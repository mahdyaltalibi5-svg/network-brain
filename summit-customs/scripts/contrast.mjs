/**
 * WCAG 2.2 AA contrast check for every text/background token pair the design uses
 * (normal text ≥ 4.5:1, large text and UI components ≥ 3:1). Backgrounds include the void,
 * the surface, charcoal cards and the gold button.
 */
const tokens = { void: "#07080A", surface: "#101114", charcoal: "#2A2B2E", ivory: "#F2EDE4", ivoryDim: "#C9C3B8", stone: "#8A8579", gold: "#C9A45C", goldBright: "#E2C27F" };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// alpha-composite a translucent colour over a background (for the header and placeholder chips)
const over = (fg, alpha, bg) => "#" + hex(fg).map((c, i) => Math.round((c * alpha + hex(bg)[i] * (1 - alpha)) * 255).toString(16).padStart(2, "0")).join("");

const pairs = [
  // [label, fg, bg, min]
  ["Body copy: ivory-dim on void", tokens.ivoryDim, tokens.void, 4.5],
  ["Headings: ivory on void", tokens.ivory, tokens.void, 4.5],
  ["Secondary: stone on void", tokens.stone, tokens.void, 4.5],
  ["Eyebrows / links: gold on void", tokens.gold, tokens.void, 4.5],
  ["Links: gold-bright on void", tokens.goldBright, tokens.void, 4.5],
  ["Body copy: ivory-dim on surface", tokens.ivoryDim, tokens.surface, 4.5],
  ["Secondary: stone on surface", tokens.stone, tokens.surface, 4.5],
  ["Eyebrows: gold on surface", tokens.gold, tokens.surface, 4.5],
  ["Headings: ivory on surface", tokens.ivory, tokens.surface, 4.5],
  ["Ivory on charcoal", tokens.ivory, tokens.charcoal, 4.5],
  ["Ivory-dim on charcoal", tokens.ivoryDim, tokens.charcoal, 4.5],
  ["Gold on charcoal", tokens.gold, tokens.charcoal, 4.5],
  ["Button: void on gold", tokens.void, tokens.gold, 4.5],
  ["Button hover: void on ivory", tokens.void, tokens.ivory, 4.5],
  ["Header: ivory-dim on void/80 over surface", tokens.ivoryDim, over(tokens.void, 0.8, tokens.surface), 4.5],
  ["Placeholder chip: gold-bright on gold/12% over void", tokens.goldBright, over(tokens.gold, 0.12, tokens.void), 4.5],
  ["Focus ring: gold vs void (UI, 3:1)", tokens.gold, tokens.void, 3],
  ["Hairline borders are decorative (exempt)", null, null, 0],
];
let failed = 0;
for (const [label, fg, bg, min] of pairs) {
  if (!fg) { console.log(`  ·  ${label}`); continue; }
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${r.toFixed(2).padStart(5)}:1 (min ${min}) ${label}`);
}
if (failed) { console.error(`\n✗ ${failed} pair(s) below WCAG 2.2 AA`); process.exit(1); }
console.log("\n✓ all text/background pairs meet WCAG 2.2 AA");
