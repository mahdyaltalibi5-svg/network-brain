"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

// The brand's mint arc. `draw` animates the stroke in once; pass `variants`
// to drive it from a parent (e.g. sweep in on hover).
export function Smile({
  className,
  color = "#3EF5B9",
  width = 10,
  draw = false,
  delay = 0,
  variants,
}: {
  className?: string;
  color?: string;
  width?: number;
  draw?: boolean;
  delay?: number;
  variants?: Variants;
}) {
  const reduce = useReducedMotion();
  const drawProps =
    draw && !reduce
      ? {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 0.7, delay, ease: [0.65, 0, 0.35, 1] as const },
        }
      : {};

  return (
    <svg viewBox="0 0 100 32" fill="none" aria-hidden className={className}>
      <motion.path
        d={`M${width / 2 + 2} ${width / 2 + 2} Q50 ${46 - width} ${98 - width / 2} ${width / 2 + 2}`}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        variants={variants}
        {...drawProps}
      />
    </svg>
  );
}
