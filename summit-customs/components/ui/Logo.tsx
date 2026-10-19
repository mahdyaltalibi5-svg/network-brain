/** Wordmark: a ridgeline that doubles as a notch lapel. Swap for the client's SVG logo when supplied. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden="true" className={className}>
      <path
        d="M1 22 L12 6 L17 13 L21 2 L27 12 L30 9 L39 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="miter"
      />
      <path d="M21 2 L21 22" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-3 text-ivory">
      <LogoMark className="text-gold" />
      <span className="font-display text-[1.35rem] leading-none tracking-[0.18em] uppercase">
        Summit <span className="text-gold">Customs</span>
      </span>
    </span>
  );
}
