"use client";

import { useEffect } from "react";
import { scenes } from "@/lib/scenes";

/**
 * Homepage scroll choreography. Pins the process section and steps through
 * the five camps, and drives the shared `scenes` store that the WebGL layer
 * follows. Works without WebGL too: steps get `data-active`, and the static
 * SVG fallbacks read the same attributes.
 */
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function ScrollScenes() {
  useEffect(() => {
    let dispose = () => {};
    let cancelled = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      dispose = setup(gsap, ScrollTrigger);
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, []);
  return null;
}

function setup(gsap: typeof import("gsap").default, ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger) {
  {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    const steps = [...document.querySelectorAll<HTMLElement>("[data-camp]")];
    const processEl = document.getElementById("process");
    const setStep = (n: number) => {
      const active = Math.min(5, Math.max(1, Math.round(n)));
      processEl?.setAttribute("data-active-camp", String(active));
      steps.forEach((el) => el.toggleAttribute("data-active", Number(el.dataset.camp) === active));
    };
    setStep(1);

    // Desktop: pin the process stage and scrub through the five steps
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const stage = document.querySelector<HTMLElement>("[data-process-stage]");
      if (!stage) return;
      stage.setAttribute("data-pinned", "");
      const st = ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: "+=220%",
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          scenes.camp = 1 + self.progress * 4;
          setStep(scenes.camp);
        },
      });
      return () => {
        st.kill();
        stage.removeAttribute("data-pinned");
      };
    });
    // Smaller screens and reduced motion: no pin; the step nearest mid-screen is active
    mm.add("(max-width: 1023.98px), (prefers-reduced-motion: reduce)", () => {
      const triggers = steps.map((el) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: (self) => {
            if (self.isActive) {
              scenes.camp = Number(el.dataset.camp);
              setStep(scenes.camp);
            }
          },
        }),
      );
      return () => triggers.forEach((t) => t.kill());
    });

    // Scene weights from section positions (recomputed every scroll update)
    const ids = ["hero", "process", "anatomy", "fabrics", "image-consulting"] as const;
    const update = () => {
      const vh = window.innerHeight;
      const top = (id: string) => document.getElementById(id)?.getBoundingClientRect().top ?? 1e9;
      const [, p, a, f, after] = ids.map(top);
      const pIn = smooth(vh * 0.95, vh * 0.25, p);
      const pOut = smooth(vh * 0.95, vh * 0.55, a);
      const aIn = smooth(vh * 0.75, vh * 0.2, a);
      const aOut = smooth(vh * 0.95, vh * 0.55, f);
      const fIn = smooth(vh * 0.75, vh * 0.2, f);
      scenes.process = pIn * (1 - pOut);
      scenes.anatomy = aIn * (1 - aOut);
      scenes.fabric = fIn;
      // narrow screens have no free column for the scenes: the 3D stays a hero-only element
      scenes.hide = window.innerWidth < 1024 ? smooth(vh * 0.9, vh * 0.3, p) : smooth(vh * 0.9, vh * 0.35, after);
      // framing: hero/process on the right, anatomy/fabric on the left, clear of headings
      const stage = document.querySelector("[data-process-stage]")?.getBoundingClientRect().top ?? 0;
      const low = scenes.process * (1 - smooth(vh * 0.7, vh * 0.02, stage)); // keep the trail below the heading until the stage pins
      const left = Math.max(scenes.anatomy, scenes.fabric);
      scenes.frameX = 0.74 + (0.22 - 0.74) * left;
      scenes.frameY = 0.52 + 0.3 * low;
      scenes.yaw = 0.62 * scenes.anatomy - 0.18 * scenes.fabric;
      scenes.zoom = 1 + 0.36 * scenes.anatomy + 0.32 * scenes.fabric + 0.1 * low;
    };
    const st = ScrollTrigger.create({ start: 0, end: "max", onUpdate: update, onRefresh: update });
    update();
    return () => {
      st.kill();
      mm.revert();
    };
  }
}
