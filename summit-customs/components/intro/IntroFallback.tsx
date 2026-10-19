import { JacketArt } from "@/components/ui/JacketArt";

/**
 * Reduced-motion / low-tier intro (3 s, no WebGL): a gold line draws the ridgeline,
 * morphs into the lapel line, the jacket appears and the logo fades in.
 * Pure SVG + SMIL, started by window.__startFallback() in the boot script.
 * Both polylines have nine points so SMIL can interpolate between them.
 */
const RIDGE = "M20,330 L70,282 L105,300 L150,222 L200,150 L236,214 L280,190 L330,266 L380,300";
const LAPEL = "M124,134 L146,184 L166,228 L184,266 L200,300 L216,266 L234,228 L254,184 L276,134";

export function IntroFallback() {
  return (
    <div className="intro-fallback-art absolute inset-0 flex flex-col items-center justify-center gap-8" aria-hidden="true">
      <svg viewBox="0 0 400 500" className="h-[52svh] w-auto overflow-visible">
        <g opacity="0">
          <animate attributeName="opacity" begin="fb-draw.end+0.35s" dur="0.6s" from="0" to="0.45" fill="freeze" />
          <JacketArt />
        </g>
        <path d={RIDGE} fill="none" stroke="#E2C27F" strokeWidth="1.6" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1">
          <animate id="fb-draw" attributeName="stroke-dashoffset" begin="indefinite" dur="1s" from="1" to="0" fill="freeze" calcMode="spline" keySplines="0.65 0 0.35 1" />
          <animate attributeName="d" begin="fb-draw.end" dur="0.8s" from={RIDGE} to={LAPEL} fill="freeze" calcMode="spline" keySplines="0.65 0 0.35 1" />
        </path>
      </svg>
      <p className="fb-logo font-display text-[clamp(1.6rem,4vw,2.6rem)] tracking-[0.22em] text-ivory uppercase">
        Summit <span className="text-gold">Customs</span>
      </p>
    </div>
  );
}
