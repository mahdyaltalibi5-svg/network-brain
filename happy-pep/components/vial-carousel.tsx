"use client";

import Image from "next/image";
import { ArrowRight } from "./icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { imageFor, products, type Product } from "@/lib/products";

type Slide = { product: Product; size: string; src: string };

// One slide per product, using its main photo.
const SLIDES: Slide[] = products.flatMap((p) => {
  const src = imageFor(p);
  const size = (p.sizes.find((s) => s.inStock && s.image === src) ?? p.sizes.find((s) => s.inStock))?.label;
  return src && size ? [{ product: p, size, src }] : [];
});

const wrap = (i: number) => ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;

// Hero carousel: the active vial big and centered, neighbors smaller and faded.
// Auto-advances, pauses on hover/touch, swipeable, keyboard and dot navigable.
export function VialCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const go = useCallback((i: number) => setActive(wrap(i)), []);

  useEffect(() => {
    if (paused || reduce || SLIDES.length < 2) return;
    const t = setInterval(() => setActive((a) => wrap(a + 1)), 3200);
    return () => clearInterval(t);
  }, [paused, reduce]);

  if (SLIDES.length === 0) return null;
  const current = SLIDES[active];

  return (
    <div
      className="relative select-none"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(active + 1);
        if (e.key === "ArrowLeft") go(active - 1);
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Our research peptides"
    >
      <motion.div
        className="relative mx-auto h-[300px] max-w-4xl touch-pan-y sm:h-[400px] md:h-[440px]"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setPaused(true)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) go(active + 1);
          else if (info.offset.x > 50) go(active - 1);
        }}
      >
        {SLIDES.map((s, i) => {
          // Shortest signed distance from the active slide, so it loops both ways.
          let o = i - active;
          if (o > SLIDES.length / 2) o -= SLIDES.length;
          if (o < -SLIDES.length / 2) o += SLIDES.length;
          const d = Math.abs(o);
          const visible = d <= 2;
          return (
            <motion.button
              key={`${s.product.slug}-${s.size}`}
              type="button"
              tabIndex={o === 0 ? 0 : -1}
              aria-label={o === 0 ? `${s.product.name} ${s.size}` : `Show ${s.product.name} ${s.size}`}
              aria-hidden={!visible}
              onClick={() => (o === 0 ? null : go(i))}
              className="absolute left-1/2 top-1/2 aspect-square w-[260px] -translate-x-1/2 -translate-y-1/2 sm:w-[360px] md:w-[400px]"
              initial={false}
              animate={{
                x: `${o * 58}%`,
                scale: d === 0 ? 1 : d === 1 ? 0.66 : 0.46,
                opacity: d === 0 ? 1 : d === 1 ? 0.55 : visible ? 0.22 : 0,
              }}
              style={{ zIndex: 10 - d, pointerEvents: visible ? "auto" : "none" }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
            >
              {/* Radial mask fades the photo's backdrop into the hero, so vials float. */}
              <span
                className="absolute inset-0"
                style={{
                  WebkitMaskImage: "radial-gradient(closest-side, #000 62%, transparent 100%)",
                  maskImage: "radial-gradient(closest-side, #000 62%, transparent 100%)",
                }}
              >
                <Image src={s.src} alt="" fill priority={d <= 1} sizes="(min-width: 768px) 400px, 260px" className="object-cover" draggable={false} />
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="mt-2 flex flex-col items-center gap-3">
        <Link href={`/p/${current.product.slug}`} className="group inline-flex items-center gap-1.5 font-display text-lg font-semibold text-white hover:text-pep-mint" aria-live="polite">
          {current.product.name} · {current.size}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a vial">
          {SLIDES.map((s, i) => (
            <button
              key={`${s.product.slug}-${s.size}`}
              role="tab"
              aria-selected={i === active}
              aria-label={`${s.product.name} ${s.size}`}
              onClick={() => go(i)}
              className="grid h-6 place-items-center px-0.5"
            >
              <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-pep-mint" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
