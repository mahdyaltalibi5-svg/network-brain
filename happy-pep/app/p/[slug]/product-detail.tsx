"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AddToCart, SizePills } from "@/components/add-to-cart";
import { Qty } from "@/components/cart-drawer";
import { CoaButton } from "@/components/coa-modal";
import { DeliveryPromise } from "@/components/delivery";
import { ProductCard } from "@/components/product-card";
import { Vial } from "@/components/vial";
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
            className="relative rounded-[32px] bg-white p-6 md:sticky md:top-32 md:self-start"
          >
            <span className="absolute left-5 top-5 z-10 rounded-full bg-pep-mint px-3 py-1 text-xs font-bold uppercase tracking-wide text-pep-blue">
              + Free BAC water
            </span>
            <Vial name={product.name} size={size} cap={product.cap} className="mx-auto w-full max-w-md" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }}>
            <Link href="/shop" className="text-sm font-semibold text-pep-blue">
              ← Back to shop
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.15em] text-pep-ink/50">{product.kind}</p>
            <h1 className="mt-1 font-display text-5xl font-semibold tracking-tight text-pep-ink">{product.name}</h1>

            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-3xl font-semibold text-pep-blue">{money(current.price)}</p>
              {unit && <p className="text-sm text-pep-ink/50">{money(Math.round(unit * 100) / 100)}/mg</p>}
            </div>
            <div className="mt-1">
              <CoaButton product={product} />
            </div>

            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-pep-ink/70">Size</p>
              <SizePills sizes={product.sizes} value={size} onChange={setSize} />
              {best && (
                <p className="mt-2 text-sm font-semibold text-pep-blue">
                  {best.label === size ? "✓ " : ""}
                  {best.label} is the best value: save {pct(best.save)} per mg
                </p>
              )}
            </div>

            <div ref={buyRef} className="mt-6 flex items-center gap-3">
              <Qty value={qty} onChange={(n) => setQty(Math.max(1, n))} label={product.name} />
              <div className="flex-1">
                <AddToCart slug={product.slug} size={size} qty={qty} big openCart disabled={!current.inStock} />
              </div>
            </div>

            <DeliveryPromise className="mt-4" />

            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-pep-ink">
              <span aria-hidden>🧪</span>
              <span>
                <b>Stack &amp; save:</b> {firstTier.min}+ vials = {pct(firstTier.off)} off · free shipping over {money(site.freeShippingMin)}
              </span>
            </div>

            <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-pep-ink/70">
              <li className="rounded-2xl bg-white px-2 py-3">💧 Free BAC water</li>
              <li className="rounded-2xl bg-white px-2 py-3">🧪 COA every lot</li>
              <li className="rounded-2xl bg-white px-2 py-3">🔒 Secure checkout</li>
            </ul>

            <p className="mt-8 leading-relaxed text-pep-ink/75">{product.description}</p>
            <p className="mt-4 rounded-2xl border border-pep-ink/10 px-4 py-3 text-sm font-semibold text-pep-ink/70">
              For research use only. Not for human consumption.
            </p>
          </motion.div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-semibold text-pep-ink">Stack it &amp; save {pct(firstTier.off)}</h2>
            <p className="mt-1 text-pep-ink/60">Add any {firstTier.min - 1} more vial{firstTier.min > 2 ? "s" : ""} to your order and the discount applies automatically.</p>
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
          </div>
        </section>
      )}

      <StickyBuyBar product={product} size={size} qty={qty} visible={showBar} />
    </>
  );
}
