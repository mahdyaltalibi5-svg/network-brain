import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { rich } from "./Rich";

type Props = {
  eyebrow: string;
  title: ReactNode;
  /** Answer-first summary (2–3 sentences). Rendered as the lead paragraph. */
  summary?: string;
  trail?: { name: string; path: string }[];
  children?: ReactNode;
  /** Long titles (journal articles) use a smaller display size. */
  compact?: boolean;
};

export function PageHero({ eyebrow, title, summary, trail, children, compact = false }: Props) {
  return (
    <section className="relative overflow-hidden pt-36 pb-20 md:pt-48 md:pb-28" aria-labelledby="page-title">
      <RidgeBackdrop />
      <div className="container-site relative">
        {trail && <Breadcrumbs trail={trail} />}
        <p className="eyebrow mt-10">{eyebrow}</p>
        <h1
          id="page-title"
          className={`mt-6 max-w-5xl leading-[0.98] text-ivory ${compact ? "text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.04]" : "text-[clamp(2.9rem,7.4vw,6.6rem)]"}`}
        >
          {title}
        </h1>
        {summary && (
          <p data-summary className="mt-10 max-w-3xl text-[clamp(1.1rem,1.6vw,1.3rem)] leading-relaxed text-ivory-dim">
            {rich(summary)}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Quiet procedural ridgeline behind inner-page heroes (pure SVG, decorative). */
export function RidgeBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full opacity-[0.22]"
    >
      <defs>
        <linearGradient id="ridge-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#C9A45C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#C9A45C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 260 L120 210 L190 228 L300 150 L360 182 L470 96 L540 140 L610 118 L720 40 L790 104 L860 86 L960 150 L1030 128 L1130 190 L1220 170 L1320 222 L1440 200 L1440 320 L0 320 Z"
        fill="url(#ridge-fade)"
      />
      <path
        d="M0 260 L120 210 L190 228 L300 150 L360 182 L470 96 L540 140 L610 118 L720 40 L790 104 L860 86 L960 150 L1030 128 L1130 190 L1220 170 L1320 222 L1440 200"
        fill="none"
        stroke="#C9A45C"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
