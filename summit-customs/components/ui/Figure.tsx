import { Ph } from "./Rich";

/**
 * Photo slot. Until the client supplies photography it renders a sized frame
 * with a placeholder caption. Fixed aspect ratio means no layout shift when swapped
 * for <Image width height>.
 */
export function PhotoSlot({
  label,
  ratio = "4/5",
  className = "",
}: {
  label: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div
        role="img"
        aria-label={`Photograph to come: ${label}`}
        style={{ aspectRatio: ratio }}
        className="relative w-full overflow-hidden border border-line-soft bg-[radial-gradient(ellipse_at_30%_20%,#2A2B2E_0%,#101114_55%,#07080A_100%)]"
      >
        <svg aria-hidden="true" viewBox="0 0 100 125" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-30">
          <path d="M30 0 L50 48 L70 0" fill="none" stroke="#C9A45C" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
          <path d="M50 48 L50 125" stroke="#C9A45C" strokeWidth="0.3" strokeDasharray="1 1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <figcaption className="mt-3 text-sm text-ivory-dim">
        <Ph>{label}</Ph>
      </figcaption>
    </figure>
  );
}
