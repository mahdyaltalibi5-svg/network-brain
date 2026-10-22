import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/button";
import { Logo } from "@/components/logo";
import { Reveal, RevealItem } from "@/components/reveal";
import { HowItWorks } from "@/components/sections";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About · Happy Pep",
  description: "Happy Pep is a Utah-based supplier of third-party tested research peptides, with same-day local delivery and a COA for every lot.",
};

const DIFFERENT = [
  { icon: "🧪", title: "Tested by someone else", body: "Every batch goes to an independent lab for HPLC purity and mass spec identity. We don't grade our own homework." },
  { icon: "📄", title: "Transparent by default", body: "Certificates of analysis are public, on every product page and in the COA library. Not gated, not \"on request.\"" },
  { icon: "⚡", title: "Fast where we live", body: `Same-day delivery across ${site.sameDayZones.join(", ")} for orders before ${site.cutoffHour} PM. Everywhere else ships the same day.` },
  { icon: "💧", title: "Extras, standard", body: `Bacteriostatic water in every box, and free shipping over $${site.freeShippingMin}. No codes to hunt for.` },
  { icon: "💬", title: "People, not tickets", body: "Questions about an order or a batch are answered by the people who pack your order." },
];

export default function About() {
  const { founder } = site;
  return (
    <>
      <section className="bg-pep-blue pb-20 pt-12 text-center text-white md:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4">
          <RevealItem>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-mint">Research peptides · Utah</p>
          </RevealItem>
          <RevealItem>
            <Logo stacked draw className="mt-6 text-6xl" />
          </RevealItem>
          <RevealItem>
            <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight sm:text-5xl">About Happy Pep</h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 text-lg text-white/80">
              We supply research-grade peptides to labs and independent researchers. Built on three things: verified quality, open results, and fast,
              dependable fulfillment.
            </p>
          </RevealItem>
        </Reveal>
      </section>

      <section className="bg-pep-cloud py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-3xl">
            <RevealItem className="rounded-[32px] bg-white p-8 ring-1 ring-pep-ink/8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pep-blue">Our mission</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-pep-ink">The paperwork is part of the product.</h2>
              <p className="mt-3 leading-relaxed text-pep-ink/70">
                Consistent, high-purity compounds are only useful if you can verify them. So every vial we ship is backed by a third-party certificate you can
                read before you order, and match to the batch number on the label after it arrives.
              </p>
            </RevealItem>
          </Reveal>

          <Reveal className="mt-16 text-center">
            <RevealItem>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-blue">Why Happy Pep</p>
            </RevealItem>
            <RevealItem>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-pep-ink">What makes us different</h2>
            </RevealItem>
          </Reveal>
          <Reveal as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENT.map((v) => (
              <RevealItem as="li" key={v.title} className="flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-pep-ink/8">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pep-mint text-xl" aria-hidden>
                  {v.icon}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-pep-ink">{v.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-pep-ink/65">{v.body}</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>

          {founder.name && (
            <Reveal className="mx-auto mt-10 max-w-3xl">
              <RevealItem className="flex flex-col items-center gap-6 rounded-[32px] bg-white p-8 text-center sm:flex-row sm:text-left">
                {founder.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={founder.photo} alt={founder.name} className="size-28 shrink-0 rounded-full object-cover" />
                )}
                <div>
                  {founder.quote && <p className="font-display text-xl font-semibold text-pep-ink">&ldquo;{founder.quote}&rdquo;</p>}
                  <p className="mt-3 text-sm font-semibold text-pep-blue">
                    {founder.name} · {founder.role}
                  </p>
                </div>
              </RevealItem>
            </Reveal>
          )}

          <Reveal className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
            <RevealItem className="rounded-[28px] bg-white p-8 ring-1 ring-pep-ink/8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pep-blue">Quality assurance</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-pep-ink">Quality standards</h2>
              <p className="mt-3 text-sm leading-relaxed text-pep-ink/70">
                Each batch is verified before it reaches you: purity by HPLC and identity by mass spectrometry, run by an independent lab. The certificate is
                published so you can match lot to data.
              </p>
              <Link href="/coas" className="mt-4 inline-block text-sm font-bold uppercase tracking-[0.15em] text-pep-blue">
                Browse certificates →
              </Link>
            </RevealItem>
            <RevealItem className="rounded-[28px] border-l-4 border-pep-blue bg-white p-8 ring-1 ring-pep-ink/8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pep-blue">Compliance</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-pep-ink">Research use only</h2>
              <p className="mt-3 text-sm leading-relaxed text-pep-ink/70">
                All products are intended strictly for in-vitro laboratory research. They are not for human or animal use and must be handled by qualified
                people in line with applicable law.
              </p>
              <Link href="/research-use" className="mt-4 inline-block text-sm font-bold uppercase tracking-[0.15em] text-pep-blue">
                Read the policy →
              </Link>
            </RevealItem>
          </Reveal>
        </div>
      </section>

      <HowItWorks />

      <section className="bg-white pb-20 text-center">
        <Button tone="blue" href="/shop">
          Shop the lab
        </Button>
      </section>
    </>
  );
}
