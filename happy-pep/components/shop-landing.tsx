"use client";

import { motion, type Variants } from "framer-motion";
import { useEntered } from "./gate";
import { Countdown } from "./countdown";
import { ZipChecker } from "./delivery";
import { Store } from "./store";
import { HowItWorks, TrustMarquee } from "./sections";
import { Faq, OurPromise, Reviews, WhyUs } from "./trust";
import { pct } from "@/lib/pricing";
import { site } from "@/lib/site";

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

// Ad landing page: a compact offer header, then products immediately.
// `city` personalizes the headline for local search pages.
export function ShopLanding({ city }: { city?: string }) {
  const entered = useEntered();
  const tier = site.stackTiers[0];

  return (
    <>
      <section className="bg-pep-blue text-white">
        <motion.div
          className="mx-auto max-w-6xl px-4 pb-6 pt-5 sm:px-6 md:pb-10 md:pt-10"
          variants={group}
          initial="hidden"
          animate={entered ? "show" : "hidden"}
        >
          <motion.div variants={rise}>
            <Countdown />
          </motion.div>
          <motion.h1 variants={rise} className="mt-4 font-display text-[2.1rem] font-semibold leading-[1] tracking-tight sm:text-5xl">
            {city ? (
              <>
                Same-day peptides in <span className="text-pep-mint">{city}.</span>
              </>
            ) : (
              <>
                Same-day in Utah. <span className="text-pep-mint">5 days everywhere else.</span>
              </>
            )}
          </motion.h1>
          <motion.ul variants={rise} className="mt-3 flex flex-wrap gap-2 text-[13px]">
            {[
              ["💧 Free BAC water", "every order"],
              [`📦 Free shipping`, `$${site.freeShippingMin}+`],
              [`🧪 ${tier.min}+ vials`, `save ${pct(tier.off)}`],
            ].map(([a, b]) => (
              <li key={a} className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
                <b className="font-semibold">{a}</b> <span className="text-pep-mint">· {b}</span>
              </li>
            ))}
          </motion.ul>
          <motion.div variants={rise} className="mt-4 max-w-xl">
            <ZipChecker dark />
          </motion.div>
        </motion.div>
      </section>
      <TrustMarquee />
      <Store compact />
      <HowItWorks />
      <OurPromise />
      <WhyUs />
      <Reviews />
      <Faq />
    </>
  );
}
