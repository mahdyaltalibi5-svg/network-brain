"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { ExperienceProps } from "@/three/Experience";
import type { IntroMode, Tier } from "@/three/config";

type Loaded = { Experience: ComponentType<ExperienceProps>; tier: Tier; mode: IntroMode };

const idle = () =>
  new Promise<void>((r) =>
    "requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 120),
  );

/** GPU tier via detect-gpu (self-hosted benchmarks). `?tier=high|mid|low` overrides for testing. */
async function detectTier(): Promise<Tier | "low"> {
  const forced = new URLSearchParams(location.search).get("tier");
  if (forced === "high" || forced === "mid" || forced === "low") return forced;
  try {
    const { getGPUTier } = await import("detect-gpu");
    const gpu = await getGPUTier({ benchmarksURL: "/gpu-benchmarks" });
    if (gpu.tier >= 3) return "high";
    if (gpu.tier === 2) return "mid";
    return "low";
  } catch {
    return "low";
  }
}

/**
 * Client island for the homepage intro and resting hero. It never renders page
 * content: it only decides whether WebGL runs, then lazy-loads the 3D bundle
 * after the HTML hero has painted. Reduced motion and low tiers never download it.
 */
export function IntroController() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    const html = document.documentElement;
    const bootMode = html.dataset.intro; // "full" | "micro" | "fallback" | undefined (intro off)
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    (async () => {
      await idle();
      let off = false;
      try {
        off = sessionStorage.getItem("sc-3d-off") === "1" && !new URLSearchParams(location.search).has("tier");
      } catch {}
      const tier = off ? "low" : await detectTier();
      if (cancelled) return;
      if (tier === "low") {
        if (bootMode === "full" || bootMode === "micro") window.__startFallback?.();
        return;
      }
      const { default: Experience } = await import("@/three/Experience");
      if (cancelled) return;
      // If the safety timeout already released the page, skip straight to the resting hero.
      const playing = (bootMode === "full" || bootMode === "micro") && !html.classList.contains("intro-done");
      const mode: IntroMode = playing ? (bootMode as IntroMode) : "none";
      if (playing) setStatus("Opening animation playing. Press Escape or choose Skip intro to go straight to the site.");
      setLoaded({ Experience, tier, mode });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      {loaded && (
        <loaded.Experience
          tier={loaded.tier}
          mode={loaded.mode}
          onDone={() => setStatus("Opening animation finished.")}
          onDegrade={() => setLoaded(null)}
        />
      )}
    </>
  );
}

declare global {
  interface Window {
    __startFallback?: () => void;
    __introFinish?: () => void;
    __introSkip?: () => void;
    __introSound?: boolean;
    __introSoundChange?: (on: boolean) => void;
    __introTilt?: boolean;
    __introT?: number;
  }
}
