"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, type Variants } from "framer-motion";
import { ArrowRight } from "./icons";

const ease = [0.22, 1, 0.36, 1] as const;

// Heading whose words rise out of a mask, one after another, as it enters view.
export function SplitHeading({
  text,
  accent,
  as = "h2",
  className = "",
  accentClass = "text-pep-mint",
}: {
  text: string;
  // Words (exact match) to color with the accent.
  accent?: string[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  accentClass?: string;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const words = text.split(" ");
  const parent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
  const child: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }
    : { hidden: { y: "110%" }, show: { y: "0%", transition: { duration: 0.7, ease } } };
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -12% 0px" }} variants={parent} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
            <motion.span variants={child} className={`inline-block ${accent?.includes(w.replace(/[.,!?]/g, "")) ? accentClass : ""}`}>
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </Tag>
  );
}

// Text link with an underline that grows from the left and an arrow that nudges.
export function ArrowLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-1.5 font-semibold ${className}`}>
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100" aria-hidden />
      </span>
      <span className="transition-transform duration-300 ease-out group-hover:translate-x-1">
        <ArrowRight />
      </span>
    </Link>
  );
}

// Hairline under the header that fills as you scroll the page.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return <motion.div className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-pep-mint" style={{ scaleX }} aria-hidden />;
}

// Image wrapper that unveils upward (clip-path) the first time it scrolls in.
export function Unveil({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { clipPath: "inset(100% 0% 0% 0% round 16px)" }}
      whileInView={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0% round 16px)" }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </motion.div>
  );
}
