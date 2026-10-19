import { gauss, type Rng } from "./rng";

/**
 * Scroll-scene targets (Phase 3), all in jacket-local space (origin = jacket centre).
 *   process: a switchback trail up a slope with five glowing camps (one per process step)
 *   anatomy: the jacket exploded into layers: shell, lining, canvas, lapel, pockets, buttons
 *   fabric:  three woven cloth swatches (warp/weft grid), rippled in the shader
 */

// ── Process: the ascent as a trail ───────────────────────────────────
export const CAMPS = [0.06, 0.29, 0.52, 0.75, 0.97];

export function trail(u: number): [number, number, number] {
  const x = -1.55 + 3.0 * u + 0.55 * Math.sin(u * Math.PI * 4.2);
  const y = -1.75 + 3.45 * Math.pow(u, 0.92);
  const z = 0.25 * Math.sin(u * Math.PI * 3);
  return [x, y, z];
}

/** tag: -1 terrain, 0 trail, 1–5 camp number */
export function processTarget(rng: Rng): { p: [number, number, number]; tag: number } {
  const r = rng();
  if (r < 0.46) {
    const u = rng();
    const [x, y, z] = trail(u);
    return { p: [x + gauss(rng) * 0.035, y + gauss(rng) * 0.035, z + gauss(rng) * 0.035], tag: 0 };
  }
  if (r < 0.64) {
    const k = Math.floor(rng() * 5);
    const [x, y, z] = trail(CAMPS[k]);
    const rad = 0.06 + Math.abs(gauss(rng)) * 0.07;
    const a = rng() * Math.PI * 2;
    const b = Math.acos(2 * rng() - 1);
    return { p: [x + rad * Math.sin(b) * Math.cos(a), y + rad * Math.cos(b), z + rad * Math.sin(b) * Math.sin(a)], tag: k + 1 };
  }
  // terrain: the slope the trail climbs, a ridge silhouette behind it
  const x = -2.4 + rng() * 4.8;
  const ridge = 1.95 - Math.abs(x - 0.9) * 0.62 + 0.18 * Math.sin(x * 3.1) + 0.1 * Math.sin(x * 7.3);
  const y = -1.95 + (ridge + 1.95) * Math.pow(rng(), 0.55);
  const edge = Math.abs(y - ridge) < 0.06 ? 1 : 0;
  return { p: [x, y, -0.55 - rng() * 0.4 + edge * 0.1], tag: edge ? -0.5 : -1 };
}

// ── Anatomy: exploded layers ─────────────────────────────────────────
export const LAYERS = ["shell", "lining", "canvas", "lapel", "pockets", "buttons"] as const;
/** exploded offsets (x, y, z) per layer, in world units */
const OFFSETS: [number, number, number][] = [
  [0, 0, 0], // shell
  [-0.35, -0.05, -1.5], // lining
  [-0.18, 0.05, -0.75], // canvas
  [0.12, 0.2, 0.75], // lapel
  [0.25, -0.25, 1.3], // pockets
  [0.45, 0.05, 1.85], // buttons
];

/** Layer index for a jacket particle (part from the jacket sampler, svg coords). */
export function layerOf(part: number, sx: number, sy: number, rng: Rng): number {
  if (part === 2) return 3;
  if (part === 3) return 5;
  if (part === 4) return 4;
  if (part === 1) return 0;
  const chest = sy < 330 && Math.abs(sx - 200) < 112;
  return chest && rng() < 0.55 ? 2 : 1;
}

export function anatomyOffset(layer: number) {
  return OFFSETS[layer];
}

/** Label anchors: the centroid of each labelled layer, after exploding (jacket-local). */
export function anatomyAnchors(jacket: Float32Array, layers: Float32Array, origin: [number, number, number]) {
  const sum = LAYERS.map(() => [0, 0, 0, 0]);
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const o = OFFSETS[l];
    const acc = sum[l];
    acc[0] += jacket[i * 3] - origin[0] + o[0];
    acc[1] += jacket[i * 3 + 1] - origin[1] + o[1];
    acc[2] += jacket[i * 3 + 2] - origin[2] + o[2];
    acc[3]++;
  }
  return sum.map(([x, y, z, n]) => (n ? [x / n, y / n, z / n] : [0, 0, 0]) as [number, number, number]);
}

// ── Fabric: three woven swatches ─────────────────────────────────────
const SW = { w: 1.25, h: 1.75 };
export function fabricTarget(rng: Rng): { p: [number, number, number]; tag: number } {
  const panel = Math.floor(rng() * 3);
  // woven: points lie on warp (vertical) or weft (horizontal) threads
  const threads = 38;
  const warp = rng() < 0.5;
  const t = Math.floor(rng() * threads) / (threads - 1);
  const along = rng();
  let u = warp ? t : along;
  let v = warp ? along : t;
  u += gauss(rng) * 0.002;
  v += gauss(rng) * 0.002;
  const x = (u - 0.5) * SW.w + (panel - 1) * (SW.w + 0.18);
  const y = (v - 0.5) * SW.h + (panel === 1 ? 0.18 : -0.06);
  // over-under: warp threads alternate depth along their length
  const over = Math.sin((warp ? v : u) * threads * Math.PI) * 0.012 * (warp ? 1 : -1);
  return { p: [x, y, over - Math.abs(panel - 1) * 0.15], tag: panel };
}
