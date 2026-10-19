/**
 * Plain mutable state that the GSAP master timeline tweens and the render loop reads.
 * Nothing here triggers React renders. The timeline drives everything.
 */
export function createIntroState() {
  return {
    // needle / thread
    tipOpacity: 0,
    tipPulse: 0,
    thread: 0, // draw progress along the curve, 0–1
    threadOpacity: 0,
    sparks: 1,
    dust: 0,
    // particles
    particleOpacity: 0,
    morph1: 0,
    morph2: 0,
    swirl: 0.95,
    burst: 0,
    size: 1,
    // atmosphere
    fog: 0,
    stitch: 0,
    stitchOpacity: 0,
    lightX: -0.4,
    // camera: keyframed position/target, blended with a chase cam and an orbit cam
    cam: { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 },
    chase: 0,
    orbit: { on: 0, az: 0, el: 0.1, r: 7, ty: 0 },
    shake: 0.6,
    parallax: 1,
    // post
    bloom: 1.1,
    ca: 0, // chromatic aberration, spiked only during fast camera moves
    grain: 0.16,
    // resting hero
    rest: 0,
    restFrame: 0, // 0 = centred intro framing, 1 = hero framing (offset right)
  };
}

export type IntroState = ReturnType<typeof createIntroState>;
