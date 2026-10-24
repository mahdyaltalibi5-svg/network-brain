import { isPh } from "@/lib/ph";
import { rich } from "./Rich";

/**
 * Quotable key–value facts rendered as a definition list (easy for crawlers and AI to lift).
 * A fact the studio hasn't confirmed yet reads "Ask at your consultation" instead of a placeholder.
 */
export function FactList({ facts, className = "" }: { facts: [string, string][]; className?: string }) {
  return (
    <dl className={`grid gap-px overflow-hidden border border-line-soft bg-line-soft sm:grid-cols-2 ${className}`}>
      {facts.map(([k, v]) => (
        <div key={k} className="bg-void p-6">
          <dt className="eyebrow !text-[0.68rem] !text-stone">{k}</dt>
          <dd className="mt-2 font-display text-2xl leading-tight text-ivory">{isPh(v) ? "Ask at your consultation" : rich(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
