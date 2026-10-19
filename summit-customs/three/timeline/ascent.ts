/**
 * THE ASCENT: the master GSAP timeline for the intro.
 *
 * Every visual and audio beat of the entrance is scheduled here, so this is the one file to
 * edit when tuning intro timing. The SHOTS table holds the beat boundaries in seconds; each
 * shot's tweens are positioned relative to them.
 *
 *   VOID        0.0–1.0   gold point, one heartbeat
 *   THREAD      1.0–2.5   needle runs the thread, stitch sparks, chase cam
 *   MOUNTAIN    2.5–4.2   thread unravels into the Wasatch Range, low sweep to the summit
 *   TRANSFORM   4.2–6.0   whip-around, range re-woven into the jacket, pick-stitched lapel
 *   LABEL       6.0–7.2   push in to the chest, "SUMMIT CUSTOMS" embroidered, tagline
 *   ENTRANCE    7.2–8.0   burst past the camera, reveal the homepage
 *   (REST       8.0–9.2   particles re-gather into the resting hero jacket)
 */
import gsap from "gsap";
import { JACKET_ORIGIN } from "../config";
import type { IntroState } from "../state";
import { stitchHoles, THREAD_START, threadCurve } from "../targets/thread";
import type { Cue } from "../audio/sfx";

export const SHOTS = {
  void: 0,
  thread: 1.0,
  mountain: 2.5,
  transform: 4.2,
  label: 6.0,
  entrance: 7.2,
  end: 8.0,
  rest: 9.2,
} as const;

/** Return visits in the same session get this 1.5 s micro-version. */
export const MICRO = { morph: 0.1, fade: 0.95, end: 1.5 } as const;

/** How far along the curve the needle travels during THREAD. */
export const THREAD_TRAVEL = 0.62;

export type TimelineHooks = {
  /** Label glyph paths (SVG) to embroider, the tagline, the overlay layers that fade at the end. */
  dom: { glyphs: SVGPathElement[]; label: HTMLElement | null; tagline: HTMLElement | null; layers: HTMLElement[] };
  cue: (c: Cue) => void;
  /** The overlay starts to fade: page goes back to the top, the static hero art hides. */
  onReveal: () => void;
  /** Overlay has faded: move the canvas behind the page (the intro is over for the visitor). */
  onEntrance: () => void;
  onDone: () => void;
};

const [jx, jy, jz] = JACKET_ORIGIN;

function sph(x: number, y: number, z: number) {
  const dx = x - jx;
  const dy = y - jy;
  const dz = z - jz;
  const r = Math.hypot(dx, dy, dz);
  return { az: Math.atan2(dx, dz), el: Math.asin(dy / r), r };
}

function prepareGlyphs(glyphs: SVGPathElement[]) {
  glyphs.forEach((g) => {
    const len = g.getTotalLength();
    g.style.strokeDasharray = `${len}`;
    g.style.strokeDashoffset = `${len}`;
    g.dataset.len = String(len);
  });
}

export function buildAscent(s: IntroState, hooks: TimelineHooks) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  const { dom, cue } = hooks;
  const T = SHOTS;

  // ── VOID ─────────────────────────────────────────────────────────────
  const start = THREAD_START;
  Object.assign(s.cam, { px: start.x, py: start.y, pz: start.z + 2.4, tx: start.x, ty: start.y, tz: start.z });
  s.tipOpacity = 1;
  tl.call(() => cue("hum"), [], T.void + 0.05);
  tl.to(s, { tipPulse: 1, duration: 0.16, ease: "power2.out" }, T.void + 0.45)
    .to(s, { tipPulse: 0, duration: 0.5, ease: "power2.in" }, T.void + 0.61);

  // ── THREAD ───────────────────────────────────────────────────────────
  tl.to(s, { dust: 1, duration: 0.8, ease: "power1.out" }, T.thread - 0.3)
    .set(s, { threadOpacity: 1 }, T.thread)
    .to(s, { chase: 1, duration: 0.35, ease: "power2.out" }, T.thread)
    .to(s, { thread: THREAD_TRAVEL, duration: T.mountain - T.thread, ease: "power1.in" }, T.thread);
  // a stitch click at each hole the needle passes (inverse of power1.in: t = x²)
  stitchHoles
    .filter((h) => h.t < THREAD_TRAVEL)
    .forEach((h) => tl.call(() => cue("stitch"), [], T.thread + (T.mountain - T.thread) * Math.sqrt(h.t / THREAD_TRAVEL)));

  // ── MOUNTAIN ─────────────────────────────────────────────────────────
  const tipEnd = threadCurve.getPointAt(THREAD_TRAVEL);
  const lookEnd = threadCurve.getPointAt(THREAD_TRAVEL + 0.04);
  tl.set(s.cam, { px: tipEnd.x + 0.35, py: tipEnd.y + 0.3, pz: tipEnd.z + 1.5, tx: lookEnd.x, ty: lookEnd.y, tz: lookEnd.z }, T.mountain)
    .to(s, { particleOpacity: 1, duration: 0.3, ease: "none" }, T.mountain - 0.05)
    .to(s, { threadOpacity: 0, tipOpacity: 0, sparks: 0, dust: 0.35, duration: 0.55, ease: "power1.out" }, T.mountain)
    .to(s, { chase: 0, duration: 0.6 }, T.mountain)
    .to(s, { morph1: 1, duration: 1.45, ease: "power1.inOut" }, T.mountain)
    .to(s, { fog: 1, duration: 0.8 }, T.mountain + 0.3)
    .call(() => cue("wind"), [], T.mountain + 0.1)
    // pull back to reveal the range forming
    .to(s.cam, { px: jx - 5.2, py: jy + 2.4, pz: 8.5, tx: jx, ty: jy * 0.45, tz: jz + 1, duration: 0.65 }, T.mountain)
    // then sweep low across the ridges and over the summit's shoulder
    .to(s.cam, { px: jx - 2.4, py: jy * 0.62, pz: jz + 4.6, tx: jx, ty: jy * 0.8, tz: jz, duration: 0.6, ease: "sine.inOut" }, T.mountain + 0.65)
    .to(s.cam, { px: jx + 1.0, py: jy + 0.6, pz: jz - 2.0, tx: jx, ty: jy, tz: jz, duration: 0.45, ease: "sine.in" }, T.mountain + 1.25)
    .to(s, { lightX: 0.6, duration: 1.7, ease: "sine.inOut" }, T.mountain)
    .to(s, { ca: 0.5, duration: 0.2 }, T.mountain + 0.05)
    .to(s, { ca: 0, duration: 0.4 }, T.mountain + 0.3);

  // ── TRANSFORMATION ───────────────────────────────────────────────────
  const from = sph(jx + 1.0, jy + 0.6, jz - 2.0);
  tl.set(s.orbit, { on: 1, az: from.az, el: from.el, r: from.r, ty: 0 }, T.transform)
    .to(s.orbit, { az: 0, el: 0.06, r: 7.2, duration: 0.6, ease: "expo.inOut" }, T.transform)
    .call(() => cue("whoosh"), [], T.transform + 0.02)
    .to(s, { ca: 1, duration: 0.25, ease: "power2.in" }, T.transform)
    .to(s, { ca: 0, duration: 0.35, ease: "power2.out" }, T.transform + 0.3)
    .to(s, { morph2: 1, duration: 1.5, ease: "power1.inOut" }, T.transform + 0.05)
    .to(s, { fog: 0, dust: 0, duration: 0.6 }, T.transform + 0.2)
    .to(s, { shake: 0.25, duration: 0.8 }, T.transform + 0.8)
    .to(s.orbit, { r: 6.8, duration: 1.2, ease: "sine.inOut" }, T.transform + 0.6)
    .set(s, { stitchOpacity: 1 }, T.transform + 1.1)
    .to(s, { stitch: 1, duration: 0.85, ease: "power1.inOut" }, T.transform + 1.1)
    .to(s, { bloom: 1.5, duration: 0.6 }, T.transform + 1.3);

  // ── LABEL ────────────────────────────────────────────────────────────
  if (dom.glyphs.length) prepareGlyphs(dom.glyphs);
  tl.to(s.orbit, { r: 2.7, ty: 0.7, el: 0.03, duration: 1.0, ease: "power3.inOut" }, T.label - 0.1)
    .to(s, { swirl: 0.6, particleOpacity: 0.24, stitchOpacity: 0.3, bloom: 1.0, duration: 0.5 }, T.label - 0.05);
  if (dom.label) tl.set(dom.label, { autoAlpha: 1 }, T.label);
  dom.glyphs.forEach((g, i) => {
    tl.to(g, { strokeDashoffset: 0, duration: 0.42, ease: "none" }, T.label + 0.05 + i * 0.045);
  });
  if (dom.tagline) tl.fromTo(dom.tagline, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }, T.label + 0.5);

  // ── ENTRANCE ─────────────────────────────────────────────────────────
  const fadeOut = [dom.label, dom.tagline].filter(Boolean) as HTMLElement[];
  if (fadeOut.length) tl.to(fadeOut, { autoAlpha: 0, duration: 0.25, ease: "power1.in" }, T.entrance);
  tl.call(() => cue("snip"), [], T.entrance + 0.02)
    .to(s, { burst: 1, duration: 0.75, ease: "power2.in" }, T.entrance)
    .to(s, { ca: 0.8, duration: 0.6, ease: "power2.in" }, T.entrance)
    .to(s.orbit, { r: 1.8, duration: 0.8, ease: "power2.in" }, T.entrance)
    .to(s, { particleOpacity: 1, duration: 0.3 }, T.entrance)
    .to(s, { stitchOpacity: 0, duration: 0.3 }, T.entrance);
  tl.call(() => hooks.onReveal(), [], T.end - 0.45);
  if (dom.layers.length) tl.to(dom.layers, { autoAlpha: 0, duration: 0.45, ease: "power1.inOut" }, T.end - 0.45);
  tl.call(() => hooks.onEntrance(), [], T.end).call(() => hooks.onDone(), [], T.end);

  // ── REST: re-gather into the resting hero jacket ───────────────────
  restTail(tl, s, T.end);
  tl.addLabel("entrance", T.entrance);
  return tl;
}

/** 1.5 s return-visit version: the range is already there; it is woven into the jacket and the page appears. */
export function buildMicro(s: IntroState, hooks: TimelineHooks) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  Object.assign(s, { morph1: 1, particleOpacity: 1, fog: 0, tipOpacity: 0, threadOpacity: 0, sparks: 0, shake: 0.2 });
  Object.assign(s.orbit, { on: 1, az: -0.5, el: 0.12, r: 7.6, ty: 0 });
  tl.to(s, { morph2: 1, duration: 0.85, ease: "power2.inOut" }, MICRO.morph)
    .to(s.orbit, { az: 0, el: 0.05, r: 7.2, duration: 0.85, ease: "expo.out" }, MICRO.morph)
    .call(() => hooks.cue("whoosh"), [], MICRO.morph);
  tl.call(() => hooks.onReveal(), [], MICRO.fade);
  if (hooks.dom.layers.length) tl.to(hooks.dom.layers, { autoAlpha: 0, duration: MICRO.end - MICRO.fade, ease: "power1.inOut" }, MICRO.fade);
  tl.call(() => hooks.onEntrance(), [], MICRO.end).call(() => hooks.onDone(), [], MICRO.end);
  restTail(tl, s, MICRO.end, true);
  tl.addLabel("entrance", MICRO.fade);
  return tl;
}

function restTail(tl: gsap.core.Timeline, s: IntroState, at: number, fromJacket = false) {
  tl.set(s, { rest: 1, restFrame: 1, swirl: 0.35, shake: 0, parallax: 0.4 }, at)
    .set(s.orbit, { az: 0, el: 0.04, r: 9.2, ty: 0 }, at);
  if (!fromJacket) tl.set(s, { burst: 1 }, at);
  tl.to(s, { burst: 0, duration: 1.1, ease: "power3.out" }, at + 0.02).to(s, { bloom: 1.1, duration: 0.6 }, at);
}
