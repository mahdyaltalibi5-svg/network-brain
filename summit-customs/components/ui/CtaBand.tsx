import { business } from "@/content/business";
import { isPh } from "@/lib/ph";
import { LinkButton } from "./Button";
import { rich } from "./Rich";

/** Final CTA with full NAP, used at the foot of every page. */
export function CtaBand({ title = "Book a Private Fitting" }: { title?: string }) {
  const a = business.address;
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden border-t border-line-soft py-28 md:py-40">
      <div className="container-site grid gap-14 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="eyebrow">Private consultations</p>
          <h2 id="cta-title" className="mt-6 text-[clamp(2.8rem,6.5vw,5.8rem)] text-ivory">
            {title}
          </h2>
          <p className="mt-6 max-w-xl text-lg text-ivory-dim">
            A private, unhurried consultation at our Salt Lake City studio. Nothing is cut until you
            have approved the cloth, the design and the price.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <LinkButton href="/book">Book a Private Fitting</LinkButton>
            <LinkButton href="/contact" variant="ghost">
              Contact the Studio
            </LinkButton>
          </div>
        </div>
        <div className="md:col-span-4 md:col-start-9">
          <address className="not-italic border-l border-gold/50 pl-6 text-ivory-dim">
            <span className="block font-display text-2xl text-ivory">{business.name}</span>
            <span className="mt-2 block">{rich(a.street)}</span>
            <span className="block">
              {a.locality}, {a.region} {rich(a.postalCode)}
            </span>
            <span className="mt-3 block">
              {isPh(business.phone) ? rich(business.phone) : <a href={`tel:${business.phoneHref}`}>{business.phone}</a>}
            </span>
            <span className="mt-3 block text-sm">{rich(business.hoursText)}</span>
          </address>
        </div>
      </div>
    </section>
  );
}
