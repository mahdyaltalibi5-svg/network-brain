"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Smile } from "./smile";

const MotionLink = motion.create(Link);

const sweep: Variants = {
  rest: { pathLength: 0, opacity: 0 },
  hover: { pathLength: 1, opacity: 1, transition: { duration: 0.35, ease: [0.65, 0, 0.35, 1] } },
};

const tones = {
  mint: { cls: "bg-pep-mint text-pep-blue", smile: "#0125C4" },
  blue: { cls: "bg-pep-blue text-white", smile: "#3EF5B9" },
  ghost: { cls: "bg-white/0 text-current ring-2 ring-current/25", smile: "#3EF5B9" },
};

type Common = { tone?: keyof typeof tones; className?: string; children: React.ReactNode };
type AsLink = Common & { href: string; onClick?: () => void };
type AsButton = Common & { href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>;

// Pill button: presses to 0.97, and a smile-arc underline sweeps in on hover.
export function Button({ tone = "mint", className = "", children, ...props }: AsLink | AsButton) {
  const t = tones[tone];
  const cls = `group relative inline-flex h-14 items-center justify-center rounded-full px-8 font-display text-lg font-semibold transition-[background-color,opacity,box-shadow] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pep-mint/60 ${t.cls} ${className}`;
  const inner = (
    <>
      <span className="relative">{children}</span>
      <Smile variants={sweep} color={t.smile} width={9} className="pointer-events-none absolute bottom-1.5 left-1/2 w-10 -translate-x-1/2" />
    </>
  );
  const motionProps = { initial: "rest", animate: "rest", whileHover: "hover", whileTap: { scale: 0.97 } } as const;

  if (props.href !== undefined) {
    return (
      <MotionLink href={props.href} onClick={props.onClick} className={cls} {...motionProps}>
        {inner}
      </MotionLink>
    );
  }
  const rest = props as Omit<AsButton, keyof Common>;
  return (
    <motion.button
      {...motionProps}
      {...(rest as React.ComponentProps<typeof motion.button>)}
      whileHover={rest.disabled ? undefined : "hover"}
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      className={cls}
    >
      {inner}
    </motion.button>
  );
}
