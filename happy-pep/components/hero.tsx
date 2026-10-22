"use client";

import { motion, type Variants } from "framer-motion";
import { useEntered } from "./gate";
import { Countdown } from "./countdown";
import { ZipChecker } from "./delivery";
import { Button } from "./button";
import { Smile } from "./smile";
import { Vial } from "./vial";
import { scrollToId } from "@/lib/scroll";

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

export function Hero() {
  // Hold the entrance until the age gate has lifted.
  const entered = useEntered();

  return (
    <section className="relative overflow-hidden bg-pep-blue text-white">
      {/* soft glow */}
      <div className="pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-[#2E52FF] opacity-60 blur-3xl" aria-hidden />

      <motion.div
        className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-28 pt-10 sm:px-6 md:grid-cols-[1.25fr_1fr] md:pb-36 md:pt-20"
        variants={group}
        initial="hidden"
        animate={entered ? "show" : "hidden"}
      >
        <div>
          <motion.div variants={rise}>
            <Countdown />
          </motion.div>

          <motion.h1 variants={rise} className="mt-6 font-display text-[2.9rem] font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Same-day in Utah.
            <span className="relative mt-1 block text-pep-mint">
              5 days everywhere else.
            </span>
          </motion.h1>

          <motion.p variants={rise} className="mt-5 max-w-md text-lg text-white/80">
            Third-party tested research peptides. Free BAC water with every order.
          </motion.p>

          <motion.div variants={rise} className="mt-8">
            <Button tone="mint" onClick={() => scrollToId("shop")} className="w-full sm:w-auto sm:px-12">
              Shop now
            </Button>
          </motion.div>

          <motion.div variants={rise} className="mt-5 max-w-md">
            <ZipChecker dark />
          </motion.div>
        </div>

        <motion.div variants={rise} className="relative mx-auto hidden w-full max-w-sm md:block" aria-hidden>
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
            <Vial name="BPC-157" size="10mg" className="w-full drop-shadow-2xl" />
          </motion.div>
          <motion.div
            className="absolute -bottom-6 -left-10 w-40"
            animate={{ y: [0, 8, 0], rotate: [-8, -5, -8] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Vial name="GHK-Cu" size="50mg" cap="#5B7BFF" className="w-full drop-shadow-xl" />
          </motion.div>
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
