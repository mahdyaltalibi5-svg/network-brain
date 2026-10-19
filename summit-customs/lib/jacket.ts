/**
 * Bespoke jacket front, hand-authored in a 400 × 500 viewBox.
 * Shared by the static hero art (SVG), the reduced-motion intro and the
 * particle sampler in Phase 2, so the jacket is identical everywhere.
 * Viewer's left is the wearer's right.
 */
export type JacketPart = "outline" | "lapel" | "pocket" | "button" | "seam";

export type JacketPath = { id: string; part: JacketPart; d: string };

const mirror = (d: string) =>
  d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${400 - Number(x)},${y}`);

const left: JacketPath[] = [
  // shoulder seam: collar to shoulder point
  { id: "shoulder-l", part: "outline", d: "M176,50 C148,56 108,64 68,78" },
  // sleeve: head, outer line, cuff, inner line to the armpit
  { id: "sleeve-l", part: "outline", d: "M68,78 C54,84 50,100 50,120 L40,418 L90,428 L100,212" },
  // side body with waist suppression
  { id: "side-l", part: "outline", d: "M100,212 C104,252 100,292 96,322 C92,382 90,432 92,470" },
  // hem and cutaway front quarter rising to the lower button
  { id: "hem-l", part: "outline", d: "M92,470 L150,478 C172,470 192,420 198,352" },
  // lapel: from the top button (roll point) out to the lapel peak, notch, collar, neck
  { id: "lapel-l", part: "lapel", d: "M200,300 C176,250 140,178 124,134 L150,124 L144,106 L176,50" },
  // roll line: the lapel's inner fold
  { id: "roll-l", part: "seam", d: "M176,50 C186,120 194,220 200,300" },
  // front dart
  { id: "dart-l", part: "seam", d: "M140,214 L134,368" },
  // flap pocket
  { id: "pocket-l", part: "pocket", d: "M98,372 L164,368 L164,388 L98,392 Z" },
];

const right: JacketPath[] = left.map((p) => ({
  id: p.id.replace(/-l$/, "-r"),
  part: p.part,
  d: mirror(p.d),
}));

export const jacketPaths: JacketPath[] = [
  ...left,
  ...right,
  // breast welt pocket on the wearer's left chest
  { id: "welt", part: "pocket", d: "M246,192 L292,184 L294,193 L248,201 Z" },
  // front edge between buttons
  { id: "front", part: "seam", d: "M200,300 L200,352" },
];

export const jacketButtons = [
  { cx: 200, cy: 300, r: 5 },
  { cx: 200, cy: 352, r: 5 },
];

/** The lapel edges, used for pick-stitch tracing and the ridgeline → lapel morph. */
export const lapelLine = "M124,134 C140,178 176,250 200,300 C224,250 260,178 276,134";
