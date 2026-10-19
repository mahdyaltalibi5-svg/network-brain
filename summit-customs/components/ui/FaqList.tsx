import type { Faq } from "@/content/faq";
import { rich } from "./Rich";

/** Native <details> FAQ: works without JS; every answer is in the raw HTML. */
export function FaqList({ items, headingLevel = 3 }: { items: Faq[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="border-t border-line-soft">
      {items.map((f, i) => (
        <details key={f.id} id={`faq-${f.id}`} className="faq group border-b border-line-soft" open={i === 0}>
          <summary className="flex items-start justify-between gap-8 py-7 md:py-8">
            <H className="font-display text-[clamp(1.35rem,2.4vw,1.9rem)] leading-snug text-ivory transition-colors group-hover:text-gold-bright">
              {f.q}
            </H>
            <span aria-hidden="true" className="faq-icon mt-2 shrink-0 text-2xl leading-none font-light text-gold">
              +
            </span>
          </summary>
          <div className="prose-site pb-8 md:pb-10">
            <p>{rich(f.a)}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
