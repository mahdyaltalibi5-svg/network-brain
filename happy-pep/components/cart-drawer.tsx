"use client";

import Link from "next/link";
import { Rolling } from "./animated-number";
import { Drop } from "./icons";
import { ProductImage } from "./product-image";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./cart";
import { Button } from "./button";
import { DeliveryPromise } from "./delivery";
import { getProduct, isInStock, money, priceOf, products } from "@/lib/products";
import { pct, pricing, type Pricing } from "@/lib/pricing";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { site } from "@/lib/site";

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

function Bar({ value, done }: { value: number; done: boolean }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-pep-ink/8">
      <motion.div
        className={`h-full origin-left rounded-full ${done ? "bg-pep-mint" : "bg-pep-blue"}`}
        initial={false}
        animate={{ scaleX: Math.min(1, Math.max(0.04, value)) }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      />
    </div>
  );
}

// Goal-gradient bars: how close the cart is to the next stack discount and free shipping.
export function Unlocks({ p }: { p: Pricing }) {
  const top = site.stackTiers.at(-1)!;
  const stackMsg = p.nextTier ? (
    <>
      Add <b>{p.nextTier.need} more vial{p.nextTier.need > 1 ? "s" : ""}</b> for <b>{pct(p.nextTier.off)} off</b> everything
    </>
  ) : (
    <>
      <b>{pct(top.off)} off</b> unlocked, the best stack price
    </>
  );
  const shipMsg = p.freeShipping ? (
    <>
      <b>Free shipping</b> unlocked
    </>
  ) : (
    <>
      <b>{money(p.toFreeShipping)}</b> away from <b>free shipping</b>
    </>
  );
  return (
    <div className="space-y-3 rounded-3xl bg-pep-cloud p-4 text-sm text-pep-ink">
      <div className="space-y-1.5">
        <p>{stackMsg}</p>
        <Bar value={p.nextTier ? p.vials / p.nextTier.min : 1} done={!p.nextTier} />
      </div>
      <div className="space-y-1.5">
        <p>{shipMsg}</p>
        <Bar value={p.total / site.freeShippingMin} done={p.freeShipping} />
      </div>
    </div>
  );
}

function Upsell() {
  const { lines, add } = useCart();
  const inCart = new Set(lines.map((l) => l.slug));
  const picks = products.filter((p) => isInStock(p) && !inCart.has(p.slug)).slice(0, 3);
  if (picks.length === 0) return null;
  return (
    <div>
      <p className="mb-2 font-display text-base font-semibold">Stack it &amp; save</p>
      <ul className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1">
        {picks.map((p) => {
          const size = p.sizes.find((s) => s.inStock)!;
          return (
            <li key={p.slug} className="flex w-40 shrink-0 items-center gap-2 rounded-2xl bg-pep-cloud p-2 pr-3">
              <ProductImage product={p} size={size.label} sizes="48px" className="size-12 shrink-0 !rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-pep-ink/60">{money(size.price)}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => add(p.slug, size.label)}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-pep-blue text-lg leading-none text-white"
                aria-label={`Add ${p.name} ${size.label}`}
              >
                +
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CartDrawer() {
  const { lines, isOpen, close, setQty } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const p = pricing(lines);

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
                <Button tone="blue" href="/shop" onClick={close}>
                  Shop now
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-4" data-lenis-prevent>
                  <Unlocks p={p} />
                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {lines.map((l) => {
                        const prod = getProduct(l.slug)!;
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
                            <ProductImage product={prod} size={l.size} sizes="64px" className="size-16 shrink-0 !rounded-2xl" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{prod.name}</p>
                              <p className="text-sm text-pep-ink/60">
                                {l.size} · {money(priceOf(l.slug, l.size))}
                              </p>
                            </div>
                            <Qty value={l.qty} onChange={(n) => setQty(l.slug, l.size, n)} label={`${prod.name} ${l.size}`} />
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
                        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-pep-mint/25 text-pep-blue" aria-hidden>
                          <Drop className="size-6" />
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
                  <Upsell />
                </div>

                <div className="border-t border-pep-ink/10 px-6 pb-8 pt-4">
                  <DeliveryPromise className="mb-4" />
                  {p.discount > 0 && (
                    <div className="flex justify-between text-sm font-semibold text-pep-blue">
                      <span>Stack savings ({pct(p.off)})</span>
                      <span>−{money(p.discount)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <span className="text-pep-ink/70">Total</span>
                    <span className="flex items-baseline gap-2">
                      {p.discount > 0 && <s className="text-sm text-pep-ink/40">{money(p.subtotal)}</s>}
                      <span className="font-display text-2xl font-semibold">
                        <Rolling value={money(p.total)} />
                      </span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-pep-ink/50">{p.freeShipping ? "Free shipping included." : `+ ${money(p.shipping)} shipping`}</p>
                  <Button tone="blue" href="/checkout" onClick={close} className="mt-4 w-full">
                    Checkout · {money(p.grandTotal)}
                  </Button>
                  <Link href="/shipping" onClick={close} className="mt-3 block text-center text-xs text-pep-ink/60 underline underline-offset-2">
                    Secure checkout · COA on every lot · Free BAC water
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
