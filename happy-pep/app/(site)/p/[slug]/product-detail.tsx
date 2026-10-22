"use client";

import Link from "next/link";
import { Rolling } from "@/components/animated-number";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { ProductImage } from "@/components/product-image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AddToCart, SizePills } from "@/components/add-to-cart";
import { Qty } from "@/components/cart-drawer";
import { CoaCards } from "@/components/coa";
import { WhyUs } from "@/components/trust";
import { DeliveryPromise } from "@/components/delivery";
import { ProductCard } from "@/components/product-card";
import { spring } from "@/components/reveal";
import { bestValue, defaultSize, isInStock, money, perMg, products, type Product } from "@/lib/products";
import { pct } from "@/lib/pricing";
import { track } from "@/lib/pixel";
import { site } from "@/lib/site";

// Slim bar pinned to the bottom on phones once the main Add to cart scrolls away.
function StickyBuyBar({ product, size, qty, visible }: { product: Product; size: string; qty: number; visible: boolean }) {
  const s = product.sizes.find((x) => x.label === size)!;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "120%" }}
          animate={{ y: 0 }}
          exit={{ y: "120%" }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-pep-ink/10 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-md md:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-semibold text-pep-ink">
                {product.name} · {size}
              </p>
              <p className="text-sm font-semibold text-pep-blue">
                {money(s.price * qty)} <span className="font-normal text-pep-ink/50">+ free BAC water</span>
              </p>
            </div>
            <div className="w-36">
              <AddToCart slug={product.slug} size={size} qty={qty} openCart disabled={!s.inStock} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Volume tiers: tap one to set the quantity. The discount applies cart-wide.
function TierCards({ qty, onPick }: { qty: number; onPick: (n: number) => void }) {
  const tiers = [{ min: 1, off: 0 }, ...site.stackTiers];
  const activeIdx = tiers.reduce((a, t, i) => (qty >= t.min ? i : a), 0);
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Quantity discount">
      {tiers.map((t, i) => {
        const active = i === activeIdx;
        const best = i === tiers.length - 1;
        return (
          <button
            key={t.min}
            role="radio"
            aria-checked={active}
            onClick={() => onPick(t.min)}
            className={`relative rounded-2xl bg-white px-2 py-3 text-center ring-1 transition-colors ${active ? "text-white ring-transparent" : "text-pep-ink ring-pep-ink/10 hover:ring-pep-blue"}`}
          >
            {active && <motion.span layoutId="tier-active" className="absolute inset-0 rounded-2xl bg-pep-blue" transition={{ type: "spring", stiffness: 450, damping: 34 }} />}
            {best && (
              <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-pep-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pep-blue">
                Best value
              </span>
            )}
            <span className="relative block text-sm font-semibold">
              {t.min}
              {best ? "+" : ""} vial{t.min > 1 ? "s" : ""}
            </span>
            <span className={`relative block font-display text-lg font-semibold ${active ? "text-pep-mint" : "text-pep-blue"}`}>{t.off ? `${pct(t.off)} off` : "Standard"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  const [size, setSize] = useState(() => defaultSize(product));
  const [qty, setQty] = useState(1);
  const [showBar, setShowBar] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const current = product.sizes.find((s) => s.label === size)!;
  const best = bestValue(product);
  const unit = perMg(current);
  const firstTier = site.stackTiers[0];
  const related = products.filter((p) => p.slug !== product.slug && isInStock(p)).slice(0, 4);

  useEffect(() => {
    track("ViewContent", [{ content_id: `${product.slug}-${current.label}`, content_name: product.name, quantity: 1, price: current.price }]);
    // Only once per product view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className="bg-pep-cloud pb-16 pt-6 md:pt-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:gap-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="relative overflow-hidden rounded-[32px] md:sticky md:top-32 md:self-start"
          >
            <span className="absolute left-5 top-5 z-10 rounded-full bg-pep-mint px-3 py-1 text-xs font-bold uppercase tracking-wide text-pep-blue">
              + Free BAC water
            </span>
            <ProductImage product={product} size={size} priority sizes="(min-width: 768px) 50vw, 100vw" className="w-full !rounded-none" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }}>
            <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pep-blue transition-transform hover:-translate-x-0.5">
              <ArrowLeft /> All peptides
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-pep-blue">{product.category}</p>
            <h1 className="mt-1 font-display text-5xl font-semibold tracking-tight text-pep-ink">{product.name}</h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-display text-4xl font-semibold text-pep-blue">
                <Rolling value={money(current.price)} />
              </p>
              {unit && <p className="text-sm text-pep-ink/50">{money(Math.round(unit * 100) / 100)}/mg</p>}
              <p className="text-sm text-pep-ink/50">· Purity ≥99%</p>
            </div>
            <DeliveryPromise className="mt-3" />

            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-pep-ink/70">Size</p>
              <SizePills sizes={product.sizes} value={size} onChange={setSize} />
              {best && (
                <p className="mt-2 text-sm font-semibold text-pep-blue">
                  {best.label} is the best value: {pct(best.save)} less per mg
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-pep-ink/70">Stack &amp; save <span className="font-normal text-pep-ink/45">· applies to your whole cart</span></p>
              <TierCards qty={qty} onPick={setQty} />
            </div>

            <div ref={buyRef} className="mt-4 flex items-center gap-3">
              <Qty value={qty} onChange={(n) => setQty(Math.max(1, n))} label={product.name} />
              <div className="flex-1">
                <AddToCart slug={product.slug} size={size} qty={qty} big openCart disabled={!current.inStock} />
              </div>
            </div>

            <Link href="/work-with-us" className="mt-3 flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-pep-blue ring-1 ring-pep-blue/25 hover:bg-pep-blue/5">
              Bulk &amp; lab orders · mix &amp; match · ask for pricing <ArrowRight className="size-3.5" />
            </Link>

            <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-pep-ink/70">
              <li className="rounded-2xl bg-white px-2 py-3">Free BAC water</li>
              <li className="rounded-2xl bg-white px-2 py-3">COA every lot</li>
              <li className="rounded-2xl bg-white px-2 py-3">Secure checkout</li>
            </ul>

            <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-pep-ink/8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pep-blue">Research overview</p>
              <p className="mt-2 leading-relaxed text-pep-ink/75">{product.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-pep-ink/50">For in-vitro research use only. Not for human or veterinary use.</p>
            </div>

            <div className="mt-6">
              <CoaCards product={product} />
            </div>
          </motion.div>
        </div>
      </section>

      <WhyUs />

      {related.length > 0 && (
        <section className="bg-pep-cloud py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-semibold text-pep-ink">Frequently bought together</h2>
            <p className="mt-1 text-pep-ink/60">
              Add {firstTier.min - 1} more vial{firstTier.min > 2 ? "s" : ""} and {pct(firstTier.off)} comes off your whole cart automatically.
            </p>
            <motion.ul
              className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            >
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </motion.ul>
            <p className="mt-10 border-t border-pep-ink/10 pt-6 text-center text-xs text-pep-ink/50">
              <b className="text-pep-blue">For research use only.</b> This product is intended solely for in-vitro laboratory research. It is not a drug, food or
              cosmetic and must not be used as such.
            </p>
          </div>
        </section>
      )}

      <StickyBuyBar product={product} size={size} qty={qty} visible={showBar} />
    </>
  );
}
