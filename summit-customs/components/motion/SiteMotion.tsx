"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { whenEngaged } from "@/lib/when-engaged";

/**
 * Site-wide motion: Lenis smooth scroll, custom cursor, magnetic CTAs and the
 * gold-thread route wipe. Everything heavy is imported on first engagement; with
 * reduced motion only plain navigation remains. The cursor and magnetism need
 * a fine pointer with hover (never on touch).
 */
type Gsap = typeof import("gsap").default;


export function SiteMotion() {
  const router = useRouter();
  const pathname = usePathname();
  const wipe = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<Gsap | null>(null);
  const pending = useRef(false);

  // ── one-time setup ─────────────────────────────────────────────────
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(pointer: fine) and (hover: hover)").matches;
    const cleanups: (() => void)[] = [];
    let cancelled = false;

    const stopWaiting = whenEngaged(async () => {
      if (reduce || cancelled) return;
      const { default: gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      gsapRef.current = gsap;

      // Lenis smooth scroll on desktop, synced to the GSAP ticker
      if (fine) {
        const { default: Lenis } = await import("lenis");
        const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: true });
        lenis.on("scroll", ScrollTrigger.update);
        const raf = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        const html = document.documentElement;
        const sync = () => (html.classList.contains("intro-on") && !html.classList.contains("intro-done") ? lenis.stop() : lenis.start());
        const mo = new MutationObserver(sync);
        mo.observe(html, { attributes: true, attributeFilter: ["class"] });
        sync();
        window.__lenis = lenis;
        cleanups.push(() => {
          mo.disconnect();
          gsap.ticker.remove(raf);
          lenis.destroy();
          window.__lenis = undefined;
        });
      }

      if (!fine) return;

      // Custom cursor: a dot that tracks exactly, a ring that follows with weight
      const html = document.documentElement;
      const dot = Object.assign(document.createElement("div"), { className: "cursor-dot" });
      const ring = Object.assign(document.createElement("div"), { className: "cursor-ring" });
      dot.setAttribute("aria-hidden", "true");
      ring.setAttribute("aria-hidden", "true");
      document.body.append(ring, dot);
      html.classList.add("has-cursor");
      const dx = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3.out" });
      const dy = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3.out" });
      const rx = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3.out" });
      const ry = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3.out" });
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        html.classList.add("cursor-visible");
        dx(e.clientX);
        dy(e.clientY);
        rx(e.clientX);
        ry(e.clientY);
        const target = e.target instanceof Element ? e.target : null;
        html.classList.toggle("cursor-hover", !!target?.closest("a, button, summary, [role=button], label"));
        html.classList.toggle("cursor-text", !!target?.closest("input, textarea, select"));
      };
      const onLeave = () => html.classList.remove("cursor-visible");
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);

      // Magnetic CTAs: pulled toward the pointer, then dead still on release
      const magnets = new WeakMap<Element, { x: (v: number) => void; y: (v: number) => void }>();
      let current: HTMLElement | null = null;
      const onMagnet = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const el = (e.target instanceof Element && e.target.closest<HTMLElement>("[data-magnetic]")) || null;
        if (current && current !== el) {
          const m = magnets.get(current);
          m?.x(0);
          m?.y(0);
        }
        current = el;
        if (!el) return;
        let m = magnets.get(el);
        if (!m) {
          m = {
            x: gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" }),
          };
          magnets.set(el, m);
        }
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        m.x(Math.max(-10, Math.min(10, mx * 0.22)));
        m.y(Math.max(-8, Math.min(8, my * 0.35)));
      };
      window.addEventListener("pointermove", onMagnet, { passive: true });

      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointermove", onMagnet);
        document.removeEventListener("pointerleave", onLeave);
        dot.remove();
        ring.remove();
        html.classList.remove("has-cursor", "cursor-visible", "cursor-hover", "cursor-text");
      });
    });

    // Route wipe: intercept internal link clicks (plain left clicks only)
    const onClick = (e: MouseEvent) => {
      const gsap = gsapRef.current;
      if (!gsap || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.endsWith(".html") || (url.pathname === location.pathname && url.hash)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      const el = wipe.current;
      if (!el) return router.push(url.pathname + url.search + url.hash);
      pending.current = true;
      router.prefetch(url.pathname);
      gsap
        .timeline()
        .set(el, { autoAlpha: 1 })
        .fromTo(el.querySelector(".wipe-panel"), { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.5, ease: "power3.inOut" }, 0)
        .fromTo(el.querySelector(".wipe-thread"), { x: 0, opacity: 1 }, { x: () => window.innerWidth, duration: 0.5, ease: "power3.inOut" }, 0)
        .call(() => router.push(url.pathname + url.search + url.hash));
    };
    // capture phase: runs before next/link's handler, which then sees defaultPrevented and stands down
    document.addEventListener("click", onClick, true);
    cleanups.push(() => document.removeEventListener("click", onClick, true));

    return () => {
      cancelled = true;
      stopWaiting();
      cleanups.forEach((c) => c());
    };
  }, [router]);

  // ── on route change: reset scroll, then wipe out ─────────────────────
  useEffect(() => {
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    const gsap = gsapRef.current;
    const el = wipe.current;
    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => requestAnimationFrame(() => ScrollTrigger.refresh()));
    if (!gsap || !el || !pending.current) return;
    pending.current = false;
    gsap
      .timeline()
      .fromTo(el.querySelector(".wipe-panel"), { scaleX: 1, transformOrigin: "100% 50%" }, { scaleX: 0, duration: 0.55, ease: "power3.inOut", delay: 0.05 }, 0)
      .fromTo(el.querySelector(".wipe-thread"), { x: 0, opacity: 1 }, { x: () => window.innerWidth, duration: 0.55, ease: "power3.inOut", delay: 0.05 }, 0)
      .set(el, { autoAlpha: 0 });
  }, [pathname]);

  return (
    <div ref={wipe} className="route-wipe" aria-hidden="true">
      <span className="wipe-panel" />
      <span className="wipe-thread" />
    </div>
  );
}

declare global {
  interface Window {
    __lenis?: import("lenis").default;
  }
}
