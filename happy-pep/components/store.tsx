"use client";

import { motion } from "framer-motion";
import { ProductCard } from "./product-card";
import { Reveal, RevealItem } from "./reveal";
import { isInStock, products } from "@/lib/products";

const MAX_FEATURED = 8;

export function Store({ compact = false }: { compact?: boolean }) {
  // Out-of-stock items never sit above the fold: in-stock first, capped at 8.
  const inStock = products.filter(isInStock);
  const featured = inStock.slice(0, MAX_FEATURED);
  const rest = [...inStock.slice(MAX_FEATURED), ...products.filter((p) => !isInStock(p))];

  return (
    <section id="shop" className={`scroll-mt-28 bg-pep-cloud pb-20 ${compact ? "pt-5 md:pt-10" : "pt-10 md:pt-14"}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className={compact ? "sr-only" : "mb-8 text-center"}>
          <RevealItem>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl">The shop</h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-2 text-pep-ink/60">Pick your peptides. BAC water&apos;s on us.</p>
          </RevealItem>
        </Reveal>

        <motion.ul
          className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </motion.ul>

        {rest.length > 0 && (
          <>
            <h3 className="mb-4 mt-14 font-display text-2xl font-semibold text-pep-ink">More from the lab</h3>
            <motion.ul
              className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            >
              {rest.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </motion.ul>
          </>
        )}
      </div>
    </section>
  );
}
