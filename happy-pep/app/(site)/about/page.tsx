import type { Metadata } from "next";
import { Button } from "@/components/button";
import { Logo } from "@/components/logo";
import { Reveal, RevealItem } from "@/components/reveal";
import { HowItWorks } from "@/components/sections";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About · Happy Pep",
  description: "Utah-based research peptide supplier. Third-party tested lots, same-day local delivery, real humans on support.",
};

const VALUES = [
  { icon: "🧪", title: "Proof, not promises", body: "Every lot goes to an independent lab for HPLC and mass spec. The COA is one tap away on every product." },
  { icon: "⚡", title: "Speed is the product", body: `Order before ${site.cutoffHour} PM and it's at your door today in our Utah zones. Everywhere else, ${site.guaranteeDays} days or shipping's free.` },
  { icon: "💬", title: "Real humans", body: "Questions about an order or a lot? You'll hear back from a person, not a ticket bot." },
];

export default function About() {
  const { founder } = site;
  return (
    <>
      <section className="bg-pep-blue pb-20 pt-12 text-center text-white md:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4">
          <RevealItem>
            <Logo stacked draw className="text-6xl" />
          </RevealItem>
          <RevealItem>
            <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Utah-owned. Lab-obsessed. Fast.</h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 text-lg text-white/80">
              We started Happy Pep because buying research peptides felt sketchy: dark websites, mystery shipping times, COAs &ldquo;on request.&rdquo; So we
              built the opposite: bright, transparent, and fast.
            </p>
          </RevealItem>
        </Reveal>
      </section>

      <section className="bg-pep-cloud py-16">
        <Reveal as="ul" className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          {VALUES.map((v) => (
            <RevealItem as="li" key={v.title} className="rounded-3xl bg-white p-7">
              <span className="grid size-14 place-items-center rounded-2xl bg-pep-mint text-2xl" aria-hidden>
                {v.icon}
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold text-pep-ink">{v.title}</h2>
              <p className="mt-2 text-pep-ink/70">{v.body}</p>
            </RevealItem>
          ))}
        </Reveal>

        {founder.name && (
          <Reveal className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
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
