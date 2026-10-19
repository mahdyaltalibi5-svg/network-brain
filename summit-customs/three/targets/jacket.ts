import { svgPathProperties } from "svg-path-properties";
import { jacketButtons, jacketPaths, lapelLine } from "@/lib/jacket";
import { gauss, mulberry32, type Rng } from "./rng";

/**
 * Samples the hand-authored jacket SVG (lib/jacket.ts) into 3D particle targets:
 * points along every seam and edge, plus a sparse fill of the cloth panels,
 * wrapped onto a curved torso with a chest swell. The lapel line gets its own
 * dedicated samples so the mountain ridgeline can map onto it exactly.
 */
export const JACKET_SCALE = 0.0078; // SVG px → world units (400 × 500 → 3.1 × 3.9)

type P2 = [number, number];

/** Dense lookup table per path: svg-path-properties is exact but slow, so sample once and interpolate. */
type PathLut = { getTotalLength(): number; getPointAtLength(l: number): { x: number; y: number } };
const lutCache = new Map<string, PathLut>();
function path(d: string): PathLut {
  const hit = lutCache.get(d);
  if (hit) return hit;
  const props = new svgPathProperties(d);
  const len = props.getTotalLength();
  const N = Math.max(32, Math.ceil(len / 1.5));
  const xs = new Float32Array(N + 1);
  const ys = new Float32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const p = props.getPointAtLength((k / N) * len);
    xs[k] = p.x;
    ys[k] = p.y;
  }
  const lut: PathLut = {
    getTotalLength: () => len,
    getPointAtLength: (l) => {
      const f = Math.min(N, Math.max(0, (l / len) * N));
      const k = Math.min(N - 1, Math.floor(f));
      const u = f - k;
      return { x: xs[k] + (xs[k + 1] - xs[k]) * u, y: ys[k] + (ys[k + 1] - ys[k]) * u };
    },
  };
  lutCache.set(d, lut);
  return lut;
}

/** Torso depth as a function of SVG coordinates (front of chest is z = 0). */
export function torsoZ(sx: number, sy: number) {
  const x = (sx - 200) / 200; // -1 … 1
  const y = (sy - 250) / 250;
  const arm = Math.abs(sx - 200) > 112 && sy > 110 ? 1 : 0;
  const wrap = -0.62 * x * x; // cylinder
  const chest = 0.16 * Math.exp(-((y + 0.42) ** 2) / 0.09) * Math.cos(x * 1.4);
  return (wrap + chest - arm * 0.22) * 1.0;
}

export function toWorld(sx: number, sy: number, lift = 0): [number, number, number] {
  return [(sx - 200) * JACKET_SCALE, (250 - sy) * JACKET_SCALE, torsoZ(sx, sy) + lift];
}

function normalAt(sx: number, sy: number): [number, number, number] {
  const e = 2;
  const dzdx = (torsoZ(sx + e, sy) - torsoZ(sx - e, sy)) / (2 * e * JACKET_SCALE);
  const dzdy = -(torsoZ(sx, sy + e) - torsoZ(sx, sy - e)) / (2 * e * JACKET_SCALE);
  const l = Math.hypot(dzdx, dzdy, 1);
  return [-dzdx / l, -dzdy / l, 1 / l];
}

function polyline(d: string, step = 4): P2[] {
  const p = path(d);
  const len = p.getTotalLength();
  const pts: P2[] = [];
  for (let l = 0; l <= len; l += step) {
    const { x, y } = p.getPointAtLength(l);
    pts.push([x, y]);
  }
  return pts;
}

const byId = (id: string) => jacketPaths.find((p) => p.id === id)!.d;

/** Closed silhouette polygon: left half down, across the hem opening, right half up, back across the collar. */
const silhouette: P2[] = (() => {
  const left = ["shoulder-l", "sleeve-l", "side-l", "hem-l"].flatMap((id) => polyline(byId(id), 6));
  const right = ["hem-r", "side-r", "sleeve-r", "shoulder-r"].flatMap((id) => polyline(byId(id), 6).reverse());
  return [...left, [200, 352], ...right];
})();

const shirtV: P2[] = [
  [178, 48],
  [222, 48],
  [200, 298],
];

// Rasterised cloth mask (2 px cells) so fill sampling is a lookup, not a polygon test.
const MASK_RES = 2;
const MASK_W = Math.ceil(340 / MASK_RES);
const MASK_H = Math.ceil(445 / MASK_RES);
let mask: Uint8Array | null = null;
function clothMask() {
  if (mask) return mask;
  mask = new Uint8Array(MASK_W * MASK_H);
  const fillRow = (poly: P2[], r: number, value: number) => {
    const y = 40 + (r + 0.5) * MASK_RES;
    const xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - 30) / MASK_RES - 0.5));
      const c1 = Math.min(MASK_W - 1, Math.floor((xs[k + 1] - 30) / MASK_RES - 0.5));
      for (let c = c0; c <= c1; c++) mask![r * MASK_W + c] = value;
    }
  };
  for (let r = 0; r < MASK_H; r++) {
    fillRow(silhouette, r, 1);
    fillRow(shirtV, r, 0);
  }
  return mask;
}

export type JacketSample = { positions: Float32Array; normals: Float32Array; part: Float32Array; svg: Float32Array };

/**
 * @param n total particles
 * @param lapelCount the first `lapelCount` targets lie on the lapel line, in arc order
 */
export function sampleJacket(n: number, lapelCount: number, rng: Rng = mulberry32(11)): JacketSample {
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const svg = new Float32Array(n * 2);
  const part = new Float32Array(n); // 0 cloth, 1 seam/edge, 2 lapel, 3 button, 4 pocket
  let i = 0;
  const put = (sx: number, sy: number, kind: number, lift = 0, jitter = 0) => {
    const jx = sx + gauss(rng) * jitter;
    const jy = sy + gauss(rng) * jitter;
    const [x, y, z] = toWorld(jx, jy, lift + gauss(rng) * 0.012);
    positions.set([x, y, z], i * 3);
    normals.set(normalAt(jx, jy), i * 3);
    part[i] = kind;
    svg[i * 2] = jx;
    svg[i * 2 + 1] = jy;
    i++;
  };

  // 1. Lapel line (ridgeline lands here), evenly spaced along its length
  const lapel = path(lapelLine);
  const lapelLen = lapel.getTotalLength();
  for (let k = 0; k < lapelCount; k++) {
    const { x, y } = lapel.getPointAtLength((k / Math.max(1, lapelCount - 1)) * lapelLen);
    put(x, y, 2, 0.05, 0.4);
  }

  // 2. Seams and edges, distributed by length
  const strokes = jacketPaths.map((p) => ({ p: path(p.d), part: p.part }));
  const lengths = strokes.map((s) => s.p.getTotalLength() * (s.part === "lapel" ? 1.6 : s.part === "seam" ? 0.6 : 1));
  const total = lengths.reduce((a, b) => a + b, 0);
  const strokeCount = Math.floor(n * 0.5);
  for (let k = 0; k < strokeCount && i < n; k++) {
    let r = rng() * total;
    let s = 0;
    while (r > lengths[s]) r -= lengths[s++];
    const st = strokes[Math.min(s, strokes.length - 1)];
    const { x, y } = st.p.getPointAtLength(rng() * st.p.getTotalLength());
    const kind = st.part === "lapel" ? 2 : st.part === "pocket" ? 4 : 1;
    put(x, y, kind, st.part === "lapel" ? 0.04 : 0.015, 1.3);
  }

  // 3. Buttons
  const buttonCount = Math.floor(n * 0.025);
  for (let k = 0; k < buttonCount && i < n; k++) {
    const b = jacketButtons[k % jacketButtons.length];
    const a = rng() * Math.PI * 2;
    const r = b.r * Math.sqrt(rng()) * 1.4;
    put(b.cx + Math.cos(a) * r, b.cy + Math.sin(a) * r, 3, 0.03);
  }

  // 4. Cloth fill: sparse, inside the silhouette, outside the shirt V
  const m = clothMask();
  while (i < n) {
    const sx = 30 + rng() * 340;
    const sy = 40 + rng() * 445;
    if (!m[Math.floor((sy - 40) / MASK_RES) * MASK_W + Math.floor((sx - 30) / MASK_RES)]) continue;
    put(sx, sy, 0, 0, 0);
  }
  return { positions, normals, part, svg };
}

/** The lapel edge as 3D points, for the gold pick-stitch line. */
export function lapelCurvePoints(count = 120): [number, number, number][] {
  const p = path(lapelLine);
  const len = p.getTotalLength();
  return Array.from({ length: count }, (_, k) => {
    const { x, y } = p.getPointAtLength((k / (count - 1)) * len);
    return toWorld(x, y, 0.07);
  });
}
