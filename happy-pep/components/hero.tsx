"use client";

import { motion, type Variants } from "framer-motion";
import { useEntered } from "./gate";
import { Countdown } from "./countdown";
import { ZipChecker } from "./delivery";
import { Button } from "./button";
import { Smile } from "./smile";
import { VialCarousel } from "./vial-carousel";
import { scrollToId } from "@/lib/scroll";

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

export function Hero() {
  // Hold the entrance until the age gate has lifted.
  const entered = useEntered();

  return (
    <section className="relative overflow-hidden bg-pep-blue text-white">
      {/* Spotlight behind the vials, matched to the photo backdrop so they float. */}
      <div
        className="pointer-events-none absolute left-1/2 top-[22%] size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-2xl sm:top-[26%]"
        style={{ background: "radial-gradient(closest-side, #0036E6 0%, #002ED8 45%, transparent 100%)" }}
        aria-hidden
      />

      <motion.div
        className="relative mx-auto max-w-6xl px-4 pb-28 pt-8 text-center sm:px-6 md:pb-36 md:pt-12"
        variants={group}
        initial="hidden"
        animate={entered ? "show" : "hidden"}
      >
        <motion.p variants={rise} className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-pep-mint sm:text-sm">
          Research-grade peptides<span className="hidden sm:inline"> · Shipped from Utah</span>
        </motion.p>

        <motion.div variants={rise} className="mt-2">
          <VialCarousel />
        </motion.div>

        <motion.h1 variants={rise} className="mx-auto mt-6 max-w-3xl font-display text-[2.6rem] font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
          Same-day in Utah. <span className="block text-pep-mint">5 days everywhere else.</span>
        </motion.h1>

        <motion.p variants={rise} className="mx-auto mt-4 max-w-xl text-lg text-white/80">
          Third-party tested research peptides with a COA for every lot. Free BAC water with every order.
        </motion.p>

        <motion.div variants={rise} className="mt-7 flex flex-col items-center gap-4">
          <Button tone="mint" onClick={() => scrollToId("shop")} className="w-full sm:w-auto sm:px-12">
            Shop research peptides
          </Button>
          <Countdown />
        </motion.div>

        <motion.div variants={rise} className="mx-auto mt-5 max-w-md text-left">
          <ZipChecker dark />
        </motion.div>
      </motion.div>

      {/* The hero's bottom edge is a big smile into the store. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block h-16 w-full md:h-24">
          <path d="M0 0 Q720 160 1440 0 V120 H0 Z" fill="#3EF5B9" />
        </svg>
        {entered && <Smile draw delay={0.3} color="#0125C4" className="absolute bottom-3 left-1/2 w-24 -translate-x-1/2 md:bottom-6 md:w-32" width={8} />}
      </div>
    </section>
  );
}
