"use client";

import { motion, type Variants } from "framer-motion";

export const spring = { type: "spring", stiffness: 260, damping: 24 } as const;

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
export const item: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: spring } };

// Fades children up 16px with a 60ms stagger as they scroll into view.
// Direct children should be <RevealItem>s.
export function Reveal({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "ul" }) {
  const Tag = as === "ul" ? motion.ul : motion.div;
  return (
    <Tag className={className} variants={group} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -10% 0px" }}>
      {children}
    </Tag>
  );
}

export function RevealItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag className={className} variants={item}>
      {children}
    </Tag>
  );
}
