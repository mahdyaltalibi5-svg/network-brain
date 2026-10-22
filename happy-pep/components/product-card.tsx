"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { AddToCart, SizePills } from "./add-to-cart";
import { item } from "./reveal";
import { Vial } from "./vial";
import { bestValue, defaultSize, money, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const [size, setSize] = useState(() => defaultSize(product));
  const current = product.sizes.find((s) => s.label === size)!;
  const best = bestValue(product);

  return (
    <motion.li variants={item} className="list-none">
      <motion.article
        whileHover={{ y: -6, rotate: -0.6, boxShadow: "0 24px 48px -20px rgba(1,37,196,0.35)" }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="flex h-full flex-col rounded-3xl bg-white p-3 shadow-[0_8px_30px_-16px_rgba(1,37,196,0.25)] sm:p-4"
      >
        <Link href={`/p/${product.slug}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pep-mint/60">
          <div className="relative">
            <Vial name={product.name} size={size} cap={product.cap} className="mx-auto aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]" />
            <span className="absolute left-0 top-0 rounded-full bg-pep-mint px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-pep-blue sm:text-[11px]">
              + Free BAC water
            </span>
            {product.badge && (
              <span className="absolute right-0 top-0 rounded-full bg-pep-blue px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">
                {product.badge}
              </span>
            )}
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold leading-tight text-pep-ink sm:text-xl">{product.name}</h3>
          <p className="truncate text-xs text-pep-ink/50">{product.kind}</p>
        </Link>

        <div className="mt-3 flex flex-1 flex-col justify-end gap-3">
          <SizePills small sizes={product.sizes} value={size} onChange={setSize} />
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-xl font-semibold text-pep-blue">{money(current.price)}</span>
            {best?.label === size && <span className="text-[11px] font-semibold text-pep-blue/80">★ Best value</span>}
          </div>
          <AddToCart slug={product.slug} size={size} disabled={!current.inStock} />
        </div>
      </motion.article>
    </motion.li>
  );
}
