// A deliberately tiny icon set: thin strokes, round caps, used sparingly.
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const ArrowRight = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeft = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const ArrowUpRight = ({ className = "size-3.5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const Check = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.25} aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const Close = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Chevron = ({ className = "size-3.5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const Pin = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
    <path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.25" />
  </svg>
);

export const Drop = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
    <path d="M12 3.5s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
  </svg>
);

export const Download = ({ className = "size-3.5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);

// Live status dot: a soft pulse, used for "open now" style states.
export const LiveDot = ({ className = "bg-pep-mint" }: P) => (
  <span className="relative flex size-2" aria-hidden>
    <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${className}`} />
    <span className={`relative inline-flex size-2 rounded-full ${className}`} />
  </span>
);
