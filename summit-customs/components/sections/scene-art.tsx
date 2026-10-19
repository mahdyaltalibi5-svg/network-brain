import { jacketButtons, jacketPaths } from "@/lib/jacket";
import { CAMPS, trail } from "@/three/targets/scenes";

/**
 * Static stand-ins for the WebGL scroll scenes. Shown for reduced motion,
 * low GPU tiers and no-JS; hidden once the 3D layer is running (html.hero-3d).
 */

// Trail in SVG space: world x ∈ [-2.4, 2.4], y ∈ [-2.1, 2.1] → 400 × 400
const toSvg = (x: number, y: number) => [200 + x * 80, 200 - y * 80] as const;

export function ProcessTrailArt() {
  const pts = Array.from({ length: 120 }, (_, i) => {
    const [x, y] = trail(i / 119);
    return toSvg(x, y);
  });
  const d = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
  const ridge =
    "M8,330 " +
    Array.from({ length: 49 }, (_, i) => {
      const x = -2.4 + (4.8 * i) / 48;
      const y = 1.95 - Math.abs(x - 0.9) * 0.62 + 0.18 * Math.sin(x * 3.1) + 0.1 * Math.sin(x * 7.3);
      const [sx, sy] = toSvg(x, y);
      return `L${sx.toFixed(1)},${sy.toFixed(1)}`;
    }).join(" ");
  return (
    <svg data-static-3d viewBox="0 0 400 400" width="400" height="400" aria-hidden="true" className="process-art h-auto w-full max-w-[520px]">
      <path d={ridge} fill="none" stroke="#8A8579" strokeWidth="0.8" opacity="0.6" />
      <path d={d} fill="none" stroke="#C9A45C" strokeWidth="1.2" strokeDasharray="3 4" />
      {CAMPS.map((u, i) => {
        const [x, y] = trail(u);
        const [sx, sy] = toSvg(x, y);
        return (
          <g key={u} className={`camp camp-${i + 1}`}>
            <circle cx={sx} cy={sy} r="14" className="camp-halo" />
            <circle cx={sx} cy={sy} r="4" className="camp-dot" />
            <text x={sx + 14} y={sy - 12} className="camp-num">
              {String(i + 1).padStart(2, "0")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const LAYER_OFFSET: Record<string, [number, number]> = {
  lining: [-46, -40],
  canvas: [-22, -20],
  shell: [0, 0],
  lapel: [22, 20],
  pockets: [44, 40],
  buttons: [66, 58],
};

export function ExplodedJacketArt() {
  const shell = jacketPaths.filter((p) => p.part === "outline" || p.part === "seam");
  const lapel = jacketPaths.filter((p) => p.part === "lapel");
  const pockets = jacketPaths.filter((p) => p.part === "pocket");
  const t = (k: string) => `translate(${LAYER_OFFSET[k][0]} ${LAYER_OFFSET[k][1]})`;
  const label = (k: string, x: number, y: number) => (
    <text x={x} y={y} className="layer-label">
      {k.toUpperCase()}
    </text>
  );
  return (
    <svg data-static-3d viewBox="-60 -70 540 640" width="540" height="640" aria-hidden="true" className="h-auto w-full">
      <g transform={t("lining")} opacity="0.55">
        {shell.filter((p) => p.part === "outline").map((p) => (
          <path key={p.id} d={p.d} fill="none" stroke="#F2EDE4" strokeWidth="1" />
        ))}
        {label("lining", 20, 40)}
      </g>
      <g transform={t("canvas")} opacity="0.85">
        <path d="M110,120 L150,110 L196,290 L120,330 Z M290,120 L250,110 L204,290 L280,330 Z" fill="none" stroke="#B5AE9F" strokeWidth="1" strokeDasharray="2 2.5" />
        {label("canvas", 40, 100)}
      </g>
      <g transform={t("shell")}>
        {shell.map((p) => (
          <path key={p.id} d={p.d} fill="none" stroke="#C9A45C" strokeWidth={p.part === "seam" ? 0.7 : 1.2} strokeDasharray={p.part === "seam" ? "2 3" : undefined} />
        ))}
      </g>
      <g transform={t("lapel")}>
        {lapel.map((p) => (
          <path key={p.id} d={p.d} fill="none" stroke="#E2C27F" strokeWidth="2" />
        ))}
        {label("lapel", 300, 120)}
      </g>
      <g transform={t("pockets")}>
        {pockets.map((p) => (
          <path key={p.id} d={p.d} fill="none" stroke="#E2C27F" strokeWidth="1" />
        ))}
        {label("pockets", 330, 400)}
      </g>
      <g transform={t("buttons")}>
        {jacketButtons.map((b) => (
          <circle key={b.cy} cx={b.cx} cy={b.cy} r={b.r} fill="none" stroke="#F2EDE4" strokeWidth="1.2" />
        ))}
        {label("buttons", 216, 395)}
      </g>
    </svg>
  );
}

export function WovenSwatchArt() {
  return (
    <div data-static-3d aria-hidden="true" className="grid w-full max-w-[460px] grid-cols-3 gap-3">
      {["swatch-ivory", "swatch-gold", "swatch-stone"].map((c, i) => (
        <div key={c} className={`swatch ${c} ${i === 1 ? "-translate-y-4" : ""}`} />
      ))}
    </div>
  );
}
