"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, RevealItem } from "./reveal";
import { Smile } from "./smile";
import { reviews } from "@/lib/reviews";
import { site } from "@/lib/site";

export function Tested() {
  return (
    <section className="bg-white py-20">
      <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
        <RevealItem>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-pep-blue">Quality</p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl">Tested. Every batch.</h2>
          <p className="mt-4 max-w-md text-lg text-pep-ink/70">
            Independent third-party labs check every lot by HPLC and mass spec. Each product links straight to its batch COA.
          </p>
          <Link href="/coas" className="group mt-6 inline-flex flex-col font-display text-lg font-semibold text-pep-blue">
            See the COAs →
            <Smile className="w-16 opacity-0 transition-opacity group-hover:opacity-100" width={10} />
          </Link>
        </RevealItem>
        <RevealItem className="grid grid-cols-3 gap-3">
          {[
            { big: "99%+", small: "HPLC purity" },
            { big: "MS", small: "identity confirmed" },
            { big: "1:1", small: "COA per lot" },
          ].map((s) => (
            <div key={s.small} className="rounded-3xl bg-pep-cloud p-4 text-center sm:p-6">
              <p className="font-display text-3xl font-semibold text-pep-blue sm:text-4xl">{s.big}</p>
              <p className="mt-1 text-xs text-pep-ink/60 sm:text-sm">{s.small}</p>
            </div>
          ))}
        </RevealItem>
      </Reveal>
    </section>
  );
}

const PROMISES = [
  { icon: "⚡", title: "Same-day Utah", terms: `Order before ${site.cutoffHour} PM MT, Mon–Fri, and it's at your door today.` },
  { icon: "📦", title: "5 days or free shipping", terms: "Anywhere in the lower 48, 5 business days from ship, or we refund your shipping." },
  { icon: "💧", title: "Free BAC water", terms: "Bacteriostatic water comes in every order. No code, no minimum." },
];

export function OurPromise() {
  return (
    <section className="bg-pep-blue py-20 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <RevealItem>
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Our promise</h2>
          </RevealItem>
          <RevealItem>
            <Smile className="mx-auto mt-2 w-20" width={10} />
          </RevealItem>
        </Reveal>
        <Reveal as="ul" className="mt-10 grid gap-4 md:grid-cols-3">
          {PROMISES.map((p) => (
            <RevealItem as="li" key={p.title} className="rounded-3xl bg-white/10 p-7 ring-1 ring-white/15">
              <span className="grid size-14 place-items-center rounded-2xl bg-pep-mint text-2xl" aria-hidden>
                {p.icon}
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold">{p.title}</h3>
              <p className="mt-2 text-white/75">{p.terms}</p>
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

// Hidden until real reviews are added in lib/reviews.ts.
export function Reviews() {
  if (reviews.length === 0) return null;
  return (
    <section className="bg-pep-cloud py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center font-display text-4xl font-semibold tracking-tight text-pep-ink">Happy customers</h2>
        <Reveal as="ul" className="mt-10 grid gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <RevealItem as="li" key={r.url + r.name} className="rounded-3xl bg-white p-6">
              <p className="text-pep-mint" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
              </p>
              <p className="mt-3 text-pep-ink/80">“{r.text}”</p>
              <p className="mt-4 text-sm font-semibold text-pep-ink">
                {r.name} ·{" "}
                <a href={r.url} target="_blank" rel="noreferrer" className="text-pep-blue underline underline-offset-2">
                  {r.source}
                </a>
              </p>
            </RevealItem>
          ))}
        </Reveal>
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
    <section className="bg-white py-20">
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
