"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AddToCart, SizePills } from "@/components/add-to-cart";
import { Qty } from "@/components/cart-drawer";
import { Vial } from "@/components/vial";
import { spring } from "@/components/reveal";
import { money, type Product } from "@/lib/products";
import { track } from "@/lib/pixel";

export function ProductDetail({ product }: { product: Product }) {
  const first = product.sizes.find((s) => s.inStock) ?? product.sizes[0];
  const [size, setSize] = useState(first.label);
  const [qty, setQty] = useState(1);
  const current = product.sizes.find((s) => s.label === size)!;

  useEffect(() => {
    track("ViewContent", [{ content_id: `${product.slug}-${first.label}`, content_name: product.name, quantity: 1, price: first.price }]);
  }, [product, first]);

  return (
    <section className="bg-pep-cloud pb-20 pt-6 md:pt-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:gap-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="rounded-[32px] bg-white p-6 md:sticky md:top-32 md:self-start"
        >
          <Vial name={product.name} size={size} cap={product.cap} className="mx-auto w-full max-w-md" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }}>
          <Link href="/#shop" className="text-sm font-semibold text-pep-blue">
            ← Back to shop
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.15em] text-pep-ink/50">{product.kind}</p>
          <h1 className="mt-1 font-display text-5xl font-semibold tracking-tight text-pep-ink">{product.name}</h1>

          <p className="mt-4 font-display text-3xl font-semibold text-pep-blue">{money(current.price)}</p>
          <Link href={`/coas#${product.slug}`} className="mt-1 inline-block text-sm font-semibold text-pep-blue underline underline-offset-2">
            View COA · Lot {product.lot}
          </Link>

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-pep-ink/70">Size</p>
            <SizePills sizes={product.sizes} value={size} onChange={setSize} />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Qty value={qty} onChange={(n) => setQty(Math.max(1, n))} label={product.name} />
            <div className="flex-1">
              <AddToCart slug={product.slug} size={size} qty={qty} big openCart disabled={!current.inStock} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-pep-mint/15 px-4 py-3 text-sm font-semibold text-pep-ink">
            <span aria-hidden>💧</span> Free BAC water included with your order
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-pep-ink/70">
            <li className="rounded-2xl bg-white px-4 py-3">⚡ Same-day Utah before 12 PM MT</li>
            <li className="rounded-2xl bg-white px-4 py-3">📦 5 days USA or shipping&apos;s free</li>
          </ul>

          <p className="mt-8 leading-relaxed text-pep-ink/75">{product.description}</p>
          <p className="mt-4 rounded-2xl border border-pep-ink/10 px-4 py-3 text-sm font-semibold text-pep-ink/70">
            For research use only. Not for human consumption.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
