"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { Chevron, Close } from "./icons";
import { ScrollProgress } from "./motion";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./logo";
import { useCart } from "./cart";

const MESSAGES = [
  "Same-day delivery in Utah before 12 PM MT",
  "Everywhere else: 5 days or shipping's free",
  "Free BAC water with every order",
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

type NavLink = { href: string; label: string };
type NavItem = NavLink | { label: string; children: NavLink[] };

const NAV: NavItem[] = [
  { href: "/shop", label: "Peptides" },
  { href: "/coas", label: "COAs" },
  {
    label: "Support",
    children: [
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/shipping", label: "Shipping" },
      { href: "/refunds", label: "Refunds" },
    ],
  },
  { href: "/about", label: "About" },
  { href: "/work-with-us", label: "Work with us" },
];

function SupportMenu({ items }: { items: NavLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-semibold text-white/80 transition-colors hover:text-white"
      >
        Support
        <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <Chevron />
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full w-44 -translate-x-1/2 rounded-2xl bg-white p-2 pt-2 text-pep-ink shadow-xl ring-1 ring-black/5"
          >
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-pep-cloud">
                  {i.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  }, [open]);
  const links: NavLink[] = NAV.flatMap((n) => ("children" in n ? n.children : [n]));
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-full bg-white/10 md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-pep-ink/40" onClick={() => setOpen(false)} />
            <motion.nav
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-x-0 top-0 rounded-b-[28px] bg-pep-blue px-6 pb-8 pt-5 text-white"
              aria-label="Menu"
            >
              <div className="flex items-center justify-between">
                <span className="text-[1.65rem]">
                  <Logo />
                </span>
                <button onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-white/10" aria-label="Close menu">
                  <Close />
                </button>
              </div>
              <ul className="mt-6 space-y-1">
                {links.map((l, i) => (
                  <motion.li key={l.href} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.03, duration: 0.3 }}>
                    <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-3 py-3 font-display text-2xl font-semibold hover:bg-white/10">
                      {l.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40">
      <TopBar />
      <div className="relative bg-pep-blue/95 text-white backdrop-blur-md">
        <ScrollProgress />
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Happy Pep home" className="pt-1 text-[1.65rem]">
            <Logo />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {NAV.map((n) =>
              "children" in n ? (
                <SupportMenu key={n.label} items={n.children} />
              ) : (
                <Link key={n.href} href={n.href} className="group relative text-sm font-semibold text-white/80 transition-colors hover:text-white">
                  {n.label}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-pep-mint transition-transform duration-300 ease-out group-hover:scale-x-100" aria-hidden />
                </Link>
              ),
            )}
          </div>
          <div className="flex items-center gap-2">
            <MobileMenu />
            <CartButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
