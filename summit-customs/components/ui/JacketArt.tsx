import { useId } from "react";
import { jacketButtons, jacketPaths } from "@/lib/jacket";

/** Static line drawing of the jacket. The resting state the 3D jacket replaces. */
export function JacketArt({ className = "" }: { className?: string }) {
  const gid = `jacket-stroke-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 400 500" width="400" height="500" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E2C27F" />
          <stop offset="1" stopColor="#C9A45C" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {jacketPaths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.part === "lapel" ? "#E2C27F" : `url(#${gid})`}
          strokeWidth={p.part === "lapel" ? 1.4 : p.part === "seam" ? 0.6 : 1}
          strokeDasharray={p.part === "seam" ? "2 3" : undefined}
          strokeLinejoin="round"
        />
      ))}
      {jacketButtons.map((b) => (
        <circle key={b.cy} cx={b.cx} cy={b.cy} r={b.r} fill="none" stroke="#C9A45C" strokeWidth="1" />
      ))}
    </svg>
  );
}
