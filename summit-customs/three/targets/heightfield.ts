import { createNoise2D } from "simplex-noise";
import { mulberry32, type Rng } from "./rng";

/**
 * Procedural Wasatch Range: a meandering north–south ridgeline (along z),
 * ridged multi-octave simplex noise for the crags, and one dominant summit.
 * World units; the range spans x ∈ [-5, 5], z ∈ [-9, 7].
 */
const noise = createNoise2D(mulberry32(1847));

export const RANGE = { xMin: -5, xMax: 5, zMin: -9, zMax: 7 };
const SUMMIT_Z = -1.5;

const ridgeAxis = (z: number) => 0.55 * Math.sin(z * 0.33) + 0.25 * Math.sin(z * 0.9 + 1.3);

function ridged(x: number, z: number) {
  let sum = 0;
  let amp = 0.55;
  let freq = 0.32;
  let prev = 1;
  for (let o = 0; o < 5; o++) {
    const n = 1 - Math.abs(noise(x * freq, z * freq));
    const r = n * n * prev;
    sum += r * amp;
    prev = r;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum;
}

/** Analytic height (slow: five noise octaves). Baked into a grid once; use height() at runtime. */
function heightExact(x: number, z: number) {
  const d = x - ridgeAxis(z);
  const mask = Math.exp(-(d * d) / (2 * 1.85 * 1.85));
  const along = 1.0 + 0.55 * Math.exp(-((z - SUMMIT_Z) ** 2) / 14) + 0.25 * Math.sin(z * 0.7 + 0.4);
  const peak = 0.85 * Math.exp(-(d * d + (z - SUMMIT_Z) ** 2) / 1.4);
  const foothills = 0.18 * (noise(x * 0.5 + 9, z * 0.5) * 0.5 + 0.5);
  return mask * along * (0.45 + 1.05 * ridged(x, z)) + peak * mask + foothills * (1 - mask);
}

// Baked height grid (~0.04 units per cell), bilinearly sampled.
const GX = 251;
const GZ = 401;
let grid: Float32Array | null = null;
function bake() {
  grid = new Float32Array(GX * GZ);
  for (let j = 0; j < GZ; j++) {
    const z = RANGE.zMin + ((RANGE.zMax - RANGE.zMin) * j) / (GZ - 1);
    for (let i = 0; i < GX; i++) grid[j * GX + i] = heightExact(RANGE.xMin + ((RANGE.xMax - RANGE.xMin) * i) / (GX - 1), z);
  }
  return grid;
}

export function height(x: number, z: number) {
  const g = grid ?? bake();
  const fx = Math.min(GX - 1.001, Math.max(0, ((x - RANGE.xMin) / (RANGE.xMax - RANGE.xMin)) * (GX - 1)));
  const fz = Math.min(GZ - 1.001, Math.max(0, ((z - RANGE.zMin) / (RANGE.zMax - RANGE.zMin)) * (GZ - 1)));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const a = g[j * GX + i];
  const b = g[j * GX + i + 1];
  const c = g[(j + 1) * GX + i];
  const d = g[(j + 1) * GX + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export function normalAt(x: number, z: number): [number, number, number] {
  const e = 0.04;
  const hx = height(x + e, z) - height(x - e, z);
  const hz = height(x, z + e) - height(x, z - e);
  const nx = -hx;
  const ny = 2 * e;
  const nz = -hz;
  const l = Math.hypot(nx, ny, nz);
  return [nx / l, ny / l, nz / l];
}

/** Convexity: how far a point sits above its neighbours. High on crests. */
function crestness(x: number, z: number) {
  const e = 0.18;
  const h = height(x, z);
  const avg = (height(x + e, z) + height(x - e, z) + height(x, z + e) + height(x, z - e)) / 4;
  return h - avg;
}

/** Highest point of the range, found once by grid search. The jacket is built here. */
export const SUMMIT = (() => {
  let best = { x: 0, y: -Infinity, z: SUMMIT_Z };
  for (let i = 0; i <= 120; i++) {
    for (let j = 0; j <= 120; j++) {
      const x = -1.5 + (3 * i) / 120;
      const z = SUMMIT_Z - 2 + (4 * j) / 120;
      const y = height(x, z);
      if (y > best.y) best = { x, y, z };
    }
  }
  return best;
})();

export type MountainSample = {
  positions: Float32Array;
  normals: Float32Array;
  /** indices of the most crest-like points, sorted south → north (for ridgeline → lapel mapping) */
  crest: Uint32Array;
};

/** Rejection-sample n points, biased toward crests and steep faces so the ridgelines read. */
export function sampleMountain(n: number, crestCount: number, rng: Rng = mulberry32(7)): MountainSample {
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const score = new Float32Array(n);
  const { xMin, xMax, zMin, zMax } = RANGE;
  let i = 0;
  while (i < n) {
    const x = xMin + (xMax - xMin) * rng();
    const z = zMin + (zMax - zMin) * rng();
    const y = height(x, z);
    const c = crestness(x, z);
    const [nx, ny, nz] = normalAt(x, z);
    const slope = 1 - ny;
    const p = 0.06 + Math.min(1, Math.max(0, c * 9)) * 0.7 + slope * 0.55 + Math.min(0.3, y * 0.08);
    if (rng() > p) continue;
    positions.set([x, y, z], i * 3);
    normals.set([nx, ny, nz], i * 3);
    score[i] = c * (0.4 + y);
    i++;
  }
  const order = Array.from({ length: n }, (_, k) => k).sort((a, b) => score[b] - score[a]);
  const crest = Uint32Array.from(order.slice(0, crestCount)).sort(
    (a, b) => positions[b * 3 + 2] - positions[a * 3 + 2],
  );
  return { positions, normals, crest };
}
