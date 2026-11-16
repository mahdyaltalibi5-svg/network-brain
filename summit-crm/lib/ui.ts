import type { StageId } from "./stages";

/** Validated categorical colours for lead sources (dataviz validator, dark surface #141414). */
export const SOURCE = {
  meta: { label: "Meta ad", short: "Meta", color: "#b98a30" },
  website: { label: "Website", short: "Website", color: "#3987e5" },
  manual: { label: "Added by hand", short: "Manual", color: "#199e70" },
} as const;

/** Stage colours: a progression from gold (new) to green (ordered); lost is neutral. */
export const STAGE_COLOR: Record<StageId, string> = {
  new: "#e2c27f",
  contacted: "#6da7ec",
  booked: "#2fc7b5",
  consulted: "#a99cf0",
  ordered: "#5cc96b",
  delivered: "#f2ede4",
  lost: "#6f6b64",
};

/** Avatar backgrounds, picked from the name so a client keeps their colour. */
const AVATAR = [
  ["#3a2f1a", "#b98a30"],
  ["#1a2a3f", "#3987e5"],
  ["#173329", "#199e70"],
  ["#2e2440", "#9085e9"],
  ["#3a1d24", "#d55181"],
  ["#33291c", "#c98500"],
];
export function avatarFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATAR[h % AVATAR.length];
  const initials = name.trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  return { bg, fg, initials };
}
