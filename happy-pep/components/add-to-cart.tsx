"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./cart";

// "Add to cart" pill that morphs into a mint checkmark for a beat.
export function AddToCart({
  slug,
  size,
  qty = 1,
  disabled,
  big = false,
  openCart = false,
}: {
  slug: string;
  size: string;
  qty?: number;
  disabled?: boolean;
  big?: boolean;
  openCart?: boolean;
}) {
  const { add, open } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1300);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <motion.button
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={() => {
        add(slug, size, qty);
        setAdded(true);
        if (openCart) setTimeout(open, 450);
      }}
      className={`relative w-full overflow-hidden rounded-full bg-pep-blue font-display transition-colors duration-200 ${added ? "text-pep-blue" : "text-white"} font-semibold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pep-mint/60 ${big ? "h-14 text-lg" : "h-11 text-[15px]"}`}
      aria-live="polite"
    >
      {/* Mint fill fades in over the blue (opacity only, stays on the compositor). */}
      <motion.span
        className="absolute inset-0 bg-pep-mint"
        initial={false}
        animate={{ opacity: added ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        aria-hidden
      />
      <AnimatePresence mode="popLayout" initial={false}>
        {added ? (
          <motion.span
            key="done"
            className="relative flex items-center justify-center gap-1.5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              />
            </svg>
            Added
          </motion.span>
        ) : (
          <motion.span
            key="add"
            className="relative block"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
          >
            {disabled ? "Restocking soon" : "Add to cart"}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function SizePills({
  sizes,
  value,
  onChange,
  small = false,
}: {
  sizes: { label: string; inStock: boolean }[];
  value: string;
  onChange: (s: string) => void;
  small?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size">
      {sizes.map((s) => {
        const active = s.label === value;
        return (
          <button
            key={s.label}
            role="radio"
            aria-checked={active}
            disabled={!s.inStock}
            onClick={() => onChange(s.label)}
            className={`relative rounded-full font-semibold transition-colors disabled:line-through disabled:opacity-40 ${small ? "px-3 py-1 text-xs" : "px-5 py-2 text-sm"} ${active ? "text-white" : "bg-pep-cloud text-pep-ink hover:bg-pep-blue/10"}`}
          >
            {active && (
              <motion.span
                className="absolute inset-0 rounded-full bg-pep-blue"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
