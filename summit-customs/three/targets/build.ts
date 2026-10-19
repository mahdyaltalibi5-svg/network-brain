import { JACKET_ORIGIN, LAPEL_SHARE } from "../config";
import { sampleJacket } from "./jacket";
import { sampleMountain } from "./heightfield";
import { gauss, mulberry32 } from "./rng";
import { threadCurve } from "./thread";

export type ParticleData = {
  count: number;
  thread: Float32Array;
  mountain: Float32Array;
  nMountain: Float32Array;
  jacket: Float32Array;
  nJacket: Float32Array;
  random: Float32Array;
  part: Float32Array;
};

/**
 * Builds every per-particle target. Index i is the same particle in every
 * shape. The first `lapel` indices are ridgeline crest points in the mountain
 * and lapel-edge points in the jacket, so the ridgeline becomes the lapel.
 */
export function buildParticleData(count: number): ParticleData {
  const rng = mulberry32(2024);
  const lapel = Math.round(count * LAPEL_SHARE);
  const m = sampleMountain(count, lapel);
  const j = sampleJacket(count, lapel);

  // Reorder the mountain so crest points come first (south → north), the rest shuffled.
  const isCrest = new Uint8Array(count);
  m.crest.forEach((idx) => (isCrest[idx] = 1));
  const rest: number[] = [];
  for (let k = 0; k < count; k++) if (!isCrest[k]) rest.push(k);
  for (let k = rest.length - 1; k > 0; k--) {
    const r = Math.floor(rng() * (k + 1));
    [rest[k], rest[r]] = [rest[r], rest[k]];
  }
  const order = [...m.crest, ...rest];

  // Jacket targets beyond the lapel are shuffled too, so cloth isn't woven in sampling order.
  const jOrder = Array.from({ length: count }, (_, k) => k);
  for (let k = count - 1; k > lapel; k--) {
    const r = lapel + Math.floor(rng() * (k - lapel + 1));
    [jOrder[k], jOrder[r]] = [jOrder[r], jOrder[k]];
  }

  const mountain = new Float32Array(count * 3);
  const nMountain = new Float32Array(count * 3);
  const jacket = new Float32Array(count * 3);
  const nJacket = new Float32Array(count * 3);
  const thread = new Float32Array(count * 3);
  const random = new Float32Array(count * 4);
  const part = new Float32Array(count);
  const [ox, oy, oz] = JACKET_ORIGIN;

  // thread parameter follows the particle's position along the range, so it unravels in place
  const zs = order.map((src) => m.positions[src * 3 + 2]);
  const zMax = Math.max(...zs.slice(0, 2000));
  const zMin = Math.min(...zs.slice(0, 2000));

  for (let i = 0; i < count; i++) {
    const src = order[i];
    const js = jOrder[i];
    mountain.set(m.positions.subarray(src * 3, src * 3 + 3), i * 3);
    nMountain.set(m.normals.subarray(src * 3, src * 3 + 3), i * 3);
    jacket[i * 3] = j.positions[js * 3] + ox;
    jacket[i * 3 + 1] = j.positions[js * 3 + 1] + oy;
    jacket[i * 3 + 2] = j.positions[js * 3 + 2] + oz;
    nJacket.set(j.normals.subarray(js * 3, js * 3 + 3), i * 3);
    part[i] = j.part[js];

    const z = m.positions[src * 3 + 2];
    const t = Math.min(0.999, Math.max(0, (zMax - z) / (zMax - zMin) + gauss(rng) * 0.02));
    const p = threadCurve.getPointAt(t);
    thread[i * 3] = p.x + gauss(rng) * 0.03;
    thread[i * 3 + 1] = p.y + gauss(rng) * 0.03;
    thread[i * 3 + 2] = p.z + gauss(rng) * 0.03;

    random.set([rng(), rng(), rng(), rng()], i * 4);
  }
  return { count, thread, mountain, nMountain, jacket, nJacket, random, part };
}
