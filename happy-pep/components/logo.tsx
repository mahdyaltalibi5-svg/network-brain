"use client";

import { Smile } from "./smile";

export function Logo({
  stacked = false,
  draw = false,
  delay = 0,
  className = "",
}: {
  stacked?: boolean;
  draw?: boolean;
  delay?: number;
  className?: string;
}) {
  if (stacked) {
    return (
      <span className={`inline-flex flex-col items-center font-display font-semibold leading-[0.82] lowercase ${className}`}>
        <span>happy</span>
        <span>pep</span>
        <Smile draw={draw} delay={delay} className="mt-[0.08em] w-[1.9em]" width={11} />
      </span>
    );
  }
  return (
    <span className={`relative inline-flex flex-col items-center font-display font-semibold lowercase leading-none ${className}`}>
      <span>happy pep</span>
      <Smile draw={draw} delay={delay} className="-mt-[0.05em] w-[2.2em]" width={12} />
    </span>
  );
}
