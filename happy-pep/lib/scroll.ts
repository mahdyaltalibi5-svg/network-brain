import type Lenis from "lenis";

// Shared smooth-scroll instance plus a lock counter, so the age gate and the
// cart drawer can freeze the page without fighting each other.
let lenis: Lenis | null = null;
let locks = 0;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
  if (lenis && locks > 0) lenis.stop();
}

export function lockScroll() {
  locks++;
  document.documentElement.classList.add("scroll-locked");
  lenis?.stop();
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  document.documentElement.classList.remove("scroll-locked");
  lenis?.start();
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -96 });
  else el.scrollIntoView({ behavior: "smooth" });
}
