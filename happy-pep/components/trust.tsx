"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, RevealItem } from "./reveal";
import { Smile } from "./smile";
import { reviews } from "@/lib/reviews";
import { site } from "@/lib/site";

const ICONS = {
  tag: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5-5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
  flask: "M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3Zm-3.5 9 2.5 2.5 5-5",
  doc: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 14l2 2 4-4",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  chat: "M4 5h16v11H8l-4 4V5Zm4 5h8M8 13h5",
};

const WHY: { icon: keyof typeof ICONS; title: string; body: string }[] = [
  { icon: "tag", title: "Simple pricing", body: "The price you see is the price. Stack discounts and free shipping apply on their own, no codes to hunt for." },
  { icon: "flask", title: "99%+ purity", body: "Every lot is checked by HPLC for purity and mass spec for identity before it ships." },
  { icon: "shield", title: "Third-party tested", body: "Testing is done by independent labs, not by us, so the results are worth something." },
  { icon: "doc", title: "COA on every lot", body: "Each product links to its batch certificate. Lot number on the vial, results one tap away." },
  { icon: "bolt", title: "Same-day in Utah", body: `Order before ${site.cutoffHour} PM MT and it's at your door today in our Utah zones. Everywhere else ships same day.` },
  { icon: "chat", title: "Real human support", body: "Questions about an order or a lot get answered by a person who knows the products." },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// "Why Happy Pep": six reasons, icon cards.
export function WhyUs() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <RevealItem>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-blue">Why Happy Pep</p>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl">
              Proof, not promises<span className="text-pep-mint">.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-3 max-w-xl text-pep-ink/65">Independent testing, published results and fast local fulfillment, on every order.</p>
          </RevealItem>
        </Reveal>
        <Reveal as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w) => (
            <RevealItem as="li" key={w.title} className="rounded-3xl bg-pep-cloud p-7 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-pep-blue text-pep-mint">
                <Icon d={ICONS[w.icon]} />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-pep-ink">{w.title}</h3>
              <Smile className="mx-auto mt-1 w-8" width={12} />
              <p className="mt-2 text-sm leading-relaxed text-pep-ink/65">{w.body}</p>
            </RevealItem>
          ))}
        </Reveal>
        <p className="mt-8 text-center">
          <Link href="/coas" className="font-display text-lg font-semibold text-pep-blue underline-offset-4 hover:underline">
            See every COA →
          </Link>
        </p>
      </div>
    </section>
  );
}

const PROMISES = [
  { tag: "Every order", title: "Free BAC Water", was: `$${site.bacWaterValue} value`, big: "FREE", body: "Bacteriostatic water in every box. No code, no minimum." },
  { tag: `Orders $${site.freeShippingMin}+`, title: "Free Shipping", was: `$${site.shippingRate} value`, big: "FREE", body: `Free over $${site.freeShippingMin}. Flat $${site.shippingRate} below that.` },
  { tag: "Utah zones", title: "Same-Day Delivery", was: `Order by ${site.cutoffHour} PM MT`, big: "TODAY", body: "At your door the same day, Monday to Friday." },
  { tag: "Guaranteed", title: `Arrives in ${site.guaranteeDays} Days`, was: "or shipping's", big: "FREE", body: `Anywhere in the lower 48. Late? We refund your shipping.` },
];

export function OurPromise() {
  return (
    <section className="bg-pep-blue py-20 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <RevealItem>
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              The Happy Pep <span className="text-pep-mint">Promise</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-3 max-w-xl text-white/75">Same-day in Utah, {site.guaranteeDays} days everywhere else, and free BAC water in every box.</p>
          </RevealItem>
        </Reveal>
        <Reveal as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p) => (
            <RevealItem as="li" key={p.title} className="flex flex-col items-center rounded-3xl bg-white p-7 text-center text-pep-ink">
              <span className="rounded-full bg-pep-mint/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-pep-blue">● {p.tag}</span>
              <h3 className="mt-4 font-display text-2xl font-semibold leading-tight">{p.title}</h3>
              <p className={`mt-3 text-sm text-pep-ink/45 ${p.was.includes("value") ? "line-through" : ""}`}>{p.was}</p>
              <p className="font-display text-5xl font-semibold leading-none text-pep-blue">{p.big}</p>
              <Smile className="mt-2 w-14" width={10} />
              <p className="mt-3 text-sm text-pep-ink/65">{p.body}</p>
            </RevealItem>
          ))}
        </Reveal>
        <p className="mt-6 text-center text-sm text-white/60">
          <Link href="/shipping" className="underline underline-offset-2 hover:text-white">
            Full shipping terms
          </Link>
        </p>
      </div>
    </section>
  );
}

function ReviewButtons() {
  const { google, trustpilot } = site.reviewLinks;
  if (!google && !trustpilot) return null;
  return (
    <div className="mt-10 text-center">
      <p className="font-semibold text-pep-ink">Had a good experience?</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {google && (
          <a href={google} target="_blank" rel="noreferrer" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-pep-ink ring-1 ring-pep-ink/10 hover:ring-pep-blue">
            ★ Review us on Google ↗
          </a>
        )}
        {trustpilot && (
          <a href={trustpilot} target="_blank" rel="noreferrer" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-pep-ink ring-1 ring-pep-ink/10 hover:ring-pep-blue">
            ★ Trustpilot ↗
          </a>
        )}
      </div>
    </div>
  );
}

// Real reviews only (lib/reviews.ts). Hidden until there's something to show.
export function Reviews() {
  const hasLinks = Boolean(site.reviewLinks.google || site.reviewLinks.trustpilot);
  if (reviews.length === 0 && !hasLinks) return null;
  return (
    <section className="bg-pep-cloud py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {reviews.length > 0 && (
          <>
            <p className="text-center font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-blue">Reviews</p>
            <h2 className="mt-2 text-center font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl">The Happy Pep experience</h2>
            <Reveal as="ul" className="mt-10 grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <RevealItem as="li" key={r.url + r.name} className="flex flex-col rounded-3xl bg-white p-6">
                  <p className="text-pep-blue" aria-label={`${r.rating} out of 5 stars`}>
                    {"★".repeat(r.rating)}
                  </p>
                  <p className="mt-3 flex-1 text-pep-ink/80">“{r.text}”</p>
                  <p className="mt-4 text-sm font-semibold text-pep-ink">
                    {r.name} ·{" "}
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-pep-blue underline underline-offset-2">
                      {r.source}
                    </a>
                  </p>
                </RevealItem>
              ))}
            </Reveal>
          </>
        )}
        <ReviewButtons />
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "How does same-day Utah delivery work?",
    a: `Order before ${site.cutoffHour}:00 PM Mountain Time, Monday to Friday, and we deliver the same day in ${site.sameDayZones.join(", ")}.`,
  },
  {
    q: "What's the 5-day guarantee?",
    a: "Everywhere else in the lower 48, your order arrives within 5 business days of shipping, or we refund your shipping cost. Excludes AK, HI and PO boxes.",
  },
  { q: "Is BAC water really free?", a: "Yes. Bacteriostatic water is added to every order automatically at $0." },
  { q: "Where can I find test results?", a: "Every product page links to its batch COA, and all of them live on the COAs page." },
  {
    q: "Who can buy?",
    a: "You must be 21 or older. All products are sold for laboratory research use only and are not for human or veterinary use.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-28 bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl">Questions?</h2>
        <Reveal as="ul" className="mt-10 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <RevealItem as="li" key={f.q} className="overflow-hidden rounded-3xl bg-pep-cloud">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-display text-lg font-semibold text-pep-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-pep-mint/60"
                >
                  {f.q}
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-pep-blue text-xl leading-none text-white"
                    aria-hidden
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 30 }}
                    >
                      <p className="px-6 pb-6 text-pep-ink/70">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </RevealItem>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
