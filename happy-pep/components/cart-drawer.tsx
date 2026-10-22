"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./cart";
import { Button } from "./button";
import { Vial } from "./vial";
import { getProduct, money, priceOf } from "@/lib/products";
import { lockScroll, unlockScroll } from "@/lib/scroll";

export function Qty({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex h-9 items-center rounded-full bg-pep-cloud text-pep-ink" role="group" aria-label={`Quantity for ${label}`}>
      <button onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full text-lg hover:bg-black/5" aria-label="Decrease">
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full text-lg hover:bg-black/5" aria-label="Increase">
        +
      </button>
    </div>
  );
}

export function CartDrawer() {
  const { lines, isOpen, close, setQty, subtotal } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Cart">
          <motion.div
            className="absolute inset-0 bg-pep-ink/40 backdrop-blur-[2px]"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col rounded-l-[28px] bg-white text-pep-ink shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <h2 className="font-display text-2xl font-semibold">Your cart</h2>
              <button
                ref={closeRef}
                onClick={close}
                className="grid size-10 place-items-center rounded-full bg-pep-cloud transition-colors hover:bg-pep-blue/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pep-mint/60"
                aria-label="Close cart"
              >
                <svg viewBox="0 0 24 24" className="size-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="font-display text-xl font-semibold">Your cart is empty.</p>
                <p className="text-sm text-pep-ink/60">BAC water&apos;s free with your first add.</p>
                <Button tone="blue" href="/#shop" onClick={close}>
                  Shop now
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto px-6 pb-4" data-lenis-prevent>
                  <AnimatePresence initial={false}>
                    {lines.map((l) => {
                      const p = getProduct(l.slug)!;
                      return (
                        <motion.li
                          key={`${l.slug}-${l.size}`}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40 }}
                          transition={{ type: "spring", stiffness: 260, damping: 24 }}
                          className="flex items-center gap-4 rounded-3xl bg-pep-cloud/70 p-3"
                        >
                          <Vial name={p.name} size={l.size} cap={p.cap} className="size-16 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{p.name}</p>
                            <p className="text-sm text-pep-ink/60">
                              {l.size} · {money(priceOf(l.slug, l.size))}
                            </p>
                          </div>
                          <Qty value={l.qty} onChange={(n) => setQty(l.slug, l.size, n)} label={`${p.name} ${l.size}`} />
                        </motion.li>
                      );
                    })}
                    <motion.li
                      key="bac"
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.15 }}
                      className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-pep-mint bg-pep-mint/10 p-3"
                    >
                      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-pep-mint/30 text-3xl" aria-hidden>
                        💧
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">Free BAC Water</p>
                        <p className="text-sm text-pep-ink/60">Bacteriostatic water, 30ml</p>
                      </div>
                      <p className="flex items-center gap-1 font-semibold text-pep-blue">
                        $0.00
                        <svg viewBox="0 0 24 24" className="size-5 text-pep-mint" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </p>
                    </motion.li>
                  </AnimatePresence>
                </ul>

                <div className="border-t border-pep-ink/10 px-6 pb-8 pt-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-pep-ink/70">Subtotal</span>
                    <span className="font-display text-2xl font-semibold">{money(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-xs text-pep-ink/50">Shipping calculated at checkout.</p>
                  <Button tone="blue" href="/checkout" onClick={close} className="mt-5 w-full">
                    Checkout
                  </Button>
                  <Link href="/shipping" onClick={close} className="mt-3 block text-center text-xs text-pep-ink/60 underline underline-offset-2">
                    Same-day Utah · 5 days USA or shipping&apos;s free
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
