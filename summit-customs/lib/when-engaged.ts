/**
 * Runs `fn` once, on the visitor's first engagement (pointer move, touch, wheel,
 * key, scroll) or after `timeoutMs`, whichever comes first. Used to keep
 * motion code (gsap, Lenis) off the critical path: nothing moves before
 * someone interacts, so nothing needs loading before then.
 */
const EVENTS = ["pointermove", "pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;

export function whenEngaged(fn: () => void, timeoutMs = 6000) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cleanup();
    fn();
  };
  const timer = window.setTimeout(run, timeoutMs);
  const cleanup = () => {
    clearTimeout(timer);
    EVENTS.forEach((e) => window.removeEventListener(e, run, true));
  };
  EVENTS.forEach((e) => window.addEventListener(e, run, { passive: true, capture: true, once: true }));
  return cleanup;
}
