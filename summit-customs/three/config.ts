import { SUMMIT } from "./targets/heightfield";

export type Tier = "high" | "mid";
export type IntroMode = "full" | "micro" | "none";

export const TIER_SETTINGS: Record<Tier, { particles: number; dpr: [number, number]; post: "full" | "bloom" }> = {
  high: { particles: 40_000, dpr: [1, 2], post: "full" },
  mid: { particles: 15_000, dpr: [1, 1.5], post: "bloom" },
};

/** The jacket is woven at the summit; everything orbits this point. */
export const JACKET_ORIGIN: [number, number, number] = [SUMMIT.x, SUMMIT.y, SUMMIT.z];

/** Share of particles that trace the lapel line (and come from the ridgeline). */
export const LAPEL_SHARE = 0.06;
