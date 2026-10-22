"use client";

import Link from "next/link";
import { SplitHeading } from "./motion";
import { ArrowRight } from "./icons";
import { useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "./product-card";
import { Reveal, RevealItem } from "./reveal";
import { CATEGORIES, isInStock, products, type Product } from "@/lib/products";

const MAX_FEATURED = 8;

export function Store({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const needle = q.trim().toLowerCase();
  const match = (p: Product) => (cat === "All" || p.category === cat) && (!needle || `${p.name} ${p.category} ${p.kind}`.toLowerCase().includes(needle));
  // Out-of-stock items never sit above the fold: in-stock first, capped at 8.
  const inStock = products.filter((p) => isInStock(p) && match(p));
  const featured = inStock.slice(0, MAX_FEATURED);
  const rest = [...inStock.slice(MAX_FEATURED), ...products.filter((p) => !isInStock(p) && match(p))];
  const usedCats = CATEGORIES.filter((c) => products.some((p) => p.category === c));

  return (
    <section id="shop" className={`scroll-mt-28 bg-pep-cloud pb-20 ${compact ? "pt-5 md:pt-10" : "pt-10 md:pt-14"}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className={compact ? "sr-only" : "mb-10 text-center"}>
          <RevealItem>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-blue">Research catalog</p>
          </RevealItem>
          <RevealItem>
            <SplitHeading text="Featured peptides" className="mt-2 font-display text-4xl font-semibold tracking-tight text-pep-ink sm:text-5xl" />
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-3 max-w-lg text-pep-ink/60">Every lot third-party tested with a COA. Free BAC water with every order. For research use only.</p>
          </RevealItem>
        </Reveal>

        {compact && (
          <div className="mb-6 space-y-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search peptides…"
              aria-label="Search peptides"
              className="mx-auto block h-12 w-full max-w-md rounded-full bg-white px-5 text-sm outline-none ring-1 ring-pep-ink/10 focus:ring-2 focus:ring-pep-blue"
            />
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
              {["All", ...usedCats].map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${cat === c ? "bg-pep-blue text-white" : "bg-white text-pep-ink/70 ring-1 ring-pep-ink/10 hover:ring-pep-blue"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {featured.length === 0 && rest.length === 0 && <p className="py-10 text-center text-pep-ink/50">No peptides match that search.</p>}

        <motion.ul
          className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3"
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
              className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3"
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

        {!compact && (
          <div className="mt-10 text-center">
            <Link href="/shop" className="group inline-flex items-center gap-2 rounded-full px-6 py-3 font-display font-semibold text-pep-blue ring-2 ring-pep-blue/25 transition-colors hover:bg-pep-blue hover:text-white">
              View all peptides <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
