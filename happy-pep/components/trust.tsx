"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, RevealItem } from "./reveal";
import { ArrowLink, SplitHeading } from "./motion";
import { ArrowUpRight } from "./icons";

// Mint smile that draws itself when scrolled into view.
function SmileDraw() {
  return (
    <svg viewBox="0 0 100 32" fill="none" className="mt-2 w-14" aria-hidden>
      <motion.path
        d="M7 7 Q50 36 93 7"
        stroke="#3EF5B9"
        strokeWidth={10}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}
import { reviews } from "@/lib/reviews";
import { site } from "@/lib/site";
import { TOP_FAQ, type FaqItem } from "@/lib/faq";

const WHY = [
  { title: "Simple pricing", body: "The price you see is the price. Stack discounts and free shipping apply on their own, no codes to hunt for." },
  { title: "99%+ purity", body: "Every lot is checked by HPLC for purity and mass spec for identity before it ships." },
  { title: "Third-party tested", body: "Testing is done by independent labs, not by us, so the results are worth something." },
  { title: "A COA for every lot", body: "Each product links to its batch certificate. Batch number on the vial, results one tap away." },
  { title: "Same-day in Utah", body: `Order before ${site.cutoffHour} PM MT and it's at your door today in our Utah zones. Everywhere else ships same day.` },
  { title: "Real human support", body: "Questions about an order or a batch get answered by a person who knows the products." },
];

// "Why Happy Pep": six reasons as a numbered editorial grid.
export function WhyUs() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <RevealItem>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-blue">Why Happy Pep</p>
          </RevealItem>
          <RevealItem>
            <SplitHeading text="Proof, not promises." accent={["promises"]} accentClass="text-pep-blue" className="mt-2 font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl" />
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-3 max-w-xl text-pep-ink/65">Independent testing, published results and fast local fulfillment, on every order.</p>
          </RevealItem>
        </Reveal>
        <Reveal as="ul" className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w, i) => (
            <RevealItem as="li" key={w.title} className="group relative pt-6">
              <span className="absolute inset-x-0 top-0 h-px bg-pep-ink/10" aria-hidden />
              <span className="absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-pep-blue transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden />
              <p className="font-display text-sm font-semibold tabular-nums text-pep-blue">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-pep-ink">{w.title}</h3>
              <p className="mt-2 leading-relaxed text-pep-ink/65">{w.body}</p>
            </RevealItem>
          ))}
        </Reveal>
        <p className="mt-12 text-center">
          <ArrowLink href="/coas" className="font-display text-lg text-pep-blue">
            See every COA
          </ArrowLink>
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
            <SplitHeading text="The Happy Pep Promise" accent={["Promise"]} className="font-display text-4xl font-semibold tracking-tight sm:text-5xl" />
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-3 max-w-xl text-white/75">Same-day in Utah, {site.guaranteeDays} days everywhere else, and free BAC water in every box.</p>
          </RevealItem>
        </Reveal>
        <Reveal as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p) => (
            <RevealItem as="li" key={p.title} className="flex flex-col items-center rounded-3xl bg-white p-7 text-center text-pep-ink">
              <span className="rounded-full bg-pep-mint/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-pep-blue">{p.tag}</span>
              <h3 className="mt-4 font-display text-2xl font-semibold leading-tight">{p.title}</h3>
              <p className={`mt-3 text-sm text-pep-ink/45 ${p.was.includes("value") ? "line-through" : ""}`}>{p.was}</p>
              <motion.p
                className="font-display text-5xl font-semibold leading-none text-pep-blue"
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.15 }}
              >
                {p.big}
              </motion.p>
              <SmileDraw />
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
          <a href={google} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-pep-ink ring-1 ring-pep-ink/10 hover:ring-pep-blue">
            Review us on Google <ArrowUpRight />
          </a>
        )}
        {trustpilot && (
          <a href={trustpilot} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-pep-ink ring-1 ring-pep-ink/10 hover:ring-pep-blue">
            Trustpilot <ArrowUpRight />
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
                  <p className="flex gap-0.5 text-pep-blue" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: r.rating }, (_, i) => (
                      <svg key={i} viewBox="0 0 20 20" className="size-4 fill-current" aria-hidden>
                        <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8L10 1.8Z" />
                      </svg>
                    ))}
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

export function FaqList({ items, firstOpen = true }: { items: FaqItem[]; firstOpen?: boolean }) {
  const [open, setOpen] = useState<number | null>(firstOpen ? 0 : null);
  return (
    <Reveal as="ul" className="space-y-3">
      {items.map((f, i) => {
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
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SplitHeading text="Questions?" className="text-center font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl" />
        <div className="mt-10">
          <FaqList items={TOP_FAQ} />
        </div>
        <p className="mt-8 text-center">
          <ArrowLink href="/faq" className="font-display text-lg text-pep-blue">
            All questions
          </ArrowLink>
        </p>
      </div>
    </section>
  );
}
