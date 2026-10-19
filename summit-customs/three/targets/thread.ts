import { CatmullRomCurve3, Vector3 } from "three";
import { SUMMIT } from "./heightfield";

/**
 * The gold thread: it runs north along the ridge, stitching in and out of an
 * invisible plane hovering above the range. The plane is the "cloth".
 */
export const THREAD_PLANE_Y = SUMMIT.y + 0.25;
const START_Z = 6.2;
const END_Z = -7.5;
const STITCHES = 22;

export const threadCurve = (() => {
  const pts: Vector3[] = [];
  for (let k = 0; k <= STITCHES; k++) {
    const t = k / STITCHES;
    const z = START_Z + (END_Z - START_Z) * t;
    const x = 0.55 * Math.sin(k * 0.85) + 0.3 * Math.sin(k * 0.31);
    const dip = k === 0 ? 0 : k % 2 ? -0.32 : 0.32;
    pts.push(new Vector3(x, THREAD_PLANE_Y + dip, z));
  }
  return new CatmullRomCurve3(pts, false, "centripetal", 0.5);
})();

export const THREAD_START = threadCurve.getPointAt(0);

/** Curve parameters (0–1) where the thread pierces the plane: the stitch holes. */
export const stitchHoles: { t: number; p: Vector3 }[] = (() => {
  const out: { t: number; p: Vector3 }[] = [];
  const N = 2000;
  let prev = threadCurve.getPointAt(0).y - THREAD_PLANE_Y;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const p = threadCurve.getPointAt(t);
    const s = p.y - THREAD_PLANE_Y;
    if (Math.sign(s) !== Math.sign(prev) && prev !== 0) out.push({ t, p: p.clone() });
    prev = s;
  }
  return out;
})();

/** Approximate seconds per unit of thread progress (THREAD shot length / travel), so sparks age in real time. */
export const THREAD_TRAVEL_SECONDS = 1.5 / 0.62;
