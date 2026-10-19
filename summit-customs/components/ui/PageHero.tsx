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

/**
 * Quiet procedural ridgeline behind inner-page heroes (pure SVG, decorative).
 * Anchored to the hero's top edge at full height (the drawing sits in the lower half of the
 * viewBox): when web fonts swap in and the hero's height changes, the SVG's start position
 * doesn't move, so it can't cause layout shift.
 */
export function RidgeBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 720"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]"
    >
      <defs>
        <linearGradient id="ridge-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.55" stopColor="#C9A45C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#C9A45C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 660 L120 610 L190 628 L300 550 L360 582 L470 496 L540 540 L610 518 L720 440 L790 504 L860 486 L960 550 L1030 528 L1130 590 L1220 570 L1320 622 L1440 600 L1440 720 L0 720 Z"
        fill="url(#ridge-fade)"
      />
      <path
        d="M0 660 L120 610 L190 628 L300 550 L360 582 L470 496 L540 540 L610 518 L720 440 L790 504 L860 486 L960 550 L1030 528 L1130 590 L1220 570 L1320 622 L1440 600"
        fill="none"
        stroke="#C9A45C"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
