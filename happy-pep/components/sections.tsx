"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import { Reveal, RevealItem } from "./reveal";
import { site } from "@/lib/site";

const TRUST = ["99%+ HPLC purity", "Ships from Utah", "COA on every lot", "Free BAC water", "Same-day before noon", "5 days or free shipping", "21+ · research use only"];

// Endless ticker of proof points. Pure transform animation; static for reduced motion.
export function TrustMarquee({ dark = false }: { dark?: boolean }) {
  const reduce = useReducedMotion();
  const row = (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={false}>
      {TRUST.map((t) => (
        <li key={t} className="flex items-center gap-8 whitespace-nowrap font-display text-sm font-semibold">
          {t}
          <span className={dark ? "text-pep-mint" : "text-pep-blue"} aria-hidden>
            ●
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`overflow-hidden py-3 ${dark ? "bg-pep-ink text-white" : "bg-pep-mint text-pep-blue"}`}>
      <motion.div
        className="flex w-max"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {row}
        <div aria-hidden>{row}</div>
      </motion.div>
    </div>
  );
}

const STEPS = [
  { icon: "🛒", title: `Order by ${site.cutoffHour} PM`, body: "Mountain Time, Monday to Friday. Takes about a minute." },
  { icon: "📦", title: "Packed same day", body: "Sealed vials, batch COA on file, free BAC water in the box." },
  { icon: "⚡", title: "At your door", body: `Today in our Utah zones. Within ${site.guaranteeDays} business days everywhere else, or shipping's free.` },
];

// Three steps joined by a line that draws itself as you scroll through.
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <RevealItem>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-pep-blue">How it works</p>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl">Order to door, fast.</h2>
          </RevealItem>
        </Reveal>

        <div ref={ref} className="relative mx-auto mt-12 max-w-4xl">
          {/* track + animated fill: vertical on phones, horizontal on desktop */}
          <div className="absolute bottom-8 left-7 top-8 w-1 rounded-full bg-pep-cloud md:bottom-auto md:left-[16%] md:right-[16%] md:top-7 md:h-1 md:w-auto" aria-hidden>
            <motion.div className="h-full w-full origin-top rounded-full bg-pep-mint md:hidden" style={{ scaleY: progress }} />
            <motion.div className="hidden h-full w-full origin-left rounded-full bg-pep-mint md:block" style={{ scaleX: progress }} />
          </div>
          <Reveal as="ul" className="relative grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((s, i) => (
              <RevealItem as="li" key={s.title} className="flex gap-5 md:flex-col md:items-center md:text-center">
                <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-pep-blue text-2xl shadow-[0_10px_30px_-10px_rgba(1,37,196,0.6)]">
                  <span aria-hidden>{s.icon}</span>
                  <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-pep-mint text-xs font-bold text-pep-blue">{i + 1}</span>
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-pep-ink">{s.title}</h3>
                  <p className="mt-1 text-pep-ink/65">{s.body}</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Newsletter band at the top of the footer. Renders only once a provider
// form URL is set in lib/site.ts.
export function EmailSignup() {
  if (!site.emailSignupAction) return null;
  return (
    <div className="mb-14 grid gap-6 rounded-[28px] bg-pep-blue p-8 md:grid-cols-2 md:items-center md:p-10">
      <div>
        <p className="font-display text-3xl font-semibold leading-tight">
          Join the list. <span className="text-pep-mint">Save 10%.</span>
        </p>
        <p className="mt-2 text-white/70">Restock alerts, new lots and COA updates, first. No spam.</p>
      </div>
      <form action={site.emailSignupAction} method="post" target="_blank">
        <div className="flex gap-2 rounded-full bg-white/10 p-1.5 ring-1 ring-white/20">
          <input name="email" type="email" required placeholder="you@email.com" aria-label="Email" className="h-12 min-w-0 flex-1 bg-transparent px-4 text-white outline-none placeholder:text-white/50" />
          <button className="h-12 rounded-full bg-pep-mint px-6 font-display font-semibold text-pep-blue transition-transform active:scale-[0.97]">Subscribe</button>
        </div>
        <p className="mt-2 px-2 text-xs text-white/50">By subscribing you agree to receive emails from Happy Pep. Unsubscribe anytime.</p>
      </form>
    </div>
  );
}
