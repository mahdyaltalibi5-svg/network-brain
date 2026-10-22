"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./logo";
import { useCart } from "./cart";

const MESSAGES = [
  "⚡ Utah: same-day delivery before 12 PM MT",
  "🇺🇸 USA: 5 days or shipping's free",
  "💧 Free BAC water with every order",
];

function TopBar() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-9 overflow-hidden bg-pep-mint text-pep-blue" aria-live="off">
      <AnimatePresence initial={false}>
        <motion.p
          key={i}
          className="absolute inset-0 flex items-center justify-center px-4 text-center text-[13px] font-semibold tracking-tight"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          {MESSAGES[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function CartButton() {
  const { count, open } = useCart();
  return (
    <motion.button
      onClick={open}
      whileTap={{ scale: 0.92 }}
      className="relative grid size-11 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pep-mint/60"
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      {/* Re-keyed on every count change so the bag bounces when something is added. */}
      <motion.svg
        key={count}
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={count ? { scale: 0.6, rotate: -12 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 12 }}
        aria-hidden
      >
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      </motion.svg>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-pep-mint px-1 text-[11px] font-bold text-pep-blue"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40">
      <TopBar />
      <div className="bg-pep-blue/95 text-white backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Happy Pep home" className="pt-1 text-[1.65rem]">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/#shop" className="hidden text-sm font-semibold text-white/80 transition-colors hover:text-white sm:block">
              Shop
            </Link>
            <Link href="/coas" className="hidden text-sm font-semibold text-white/80 transition-colors hover:text-white sm:block">
              COAs
            </Link>
            <Link href="/shipping" className="hidden text-sm font-semibold text-white/80 transition-colors hover:text-white sm:block">
              Shipping
            </Link>
            <CartButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
