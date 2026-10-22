"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./cart";
import { useEntered } from "./gate";
import { useNow, fmtLeft } from "./delivery";
import { Close, LiveDot } from "./icons";
import { cutoffState } from "@/lib/cutoff";
import { money } from "@/lib/products";
import { pct, pricing } from "@/lib/pricing";
import { scrollToId } from "@/lib/scroll";
import { site } from "@/lib/site";

const DISMISS_KEY = "hp_dock_dismissed";

// Progress ring around the bag: how close the cart is to its next reward.
function Ring({ value, children }: { value: number; children: React.ReactNode }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-12 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#3EF5B9"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0.02, value))) }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>
      {children}
    </span>
  );
}

const Bag = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </svg>
);

// Floating corner pill that always points at the next reason to buy:
// the same-day cutoff, or the next cart unlock (stack discount / free shipping).
export function SalesDock() {
  const entered = useEntered();
  const { lines, count, ready, isOpen, open } = useCart();
  const path = usePathname();
  const router = useRouter();
  const now = useNow(1000);
  const [dismissed, setDismissed] = useState(true);
  const [delayed, setDelayed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The empty-cart nudge waits until the visitor scrolls, so it never covers the hero CTA.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try {
      // Session storage is only readable after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    const t = setTimeout(() => setDelayed(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // Stay out of the way where something else owns the bottom of the screen.
  const hiddenHere = path.startsWith("/checkout") || ["/terms", "/privacy", "/research-use"].includes(path);
  const productPage = path.startsWith("/p/");
  const p = pricing(lines);
  const hasItems = ready && count > 0;
  const c = now ? cutoffState(now) : null;

  const visible = entered && delayed && ready && !isOpen && !hiddenHere && (hasItems || (!dismissed && scrolled)) && now;

  let content: React.ReactNode = null;
  let onClick = () => {};
  let key = "empty";

  if (hasItems) {
    key = "cart";
    onClick = open;
    const stackGoal = p.nextTier ? p.vials / p.nextTier.min : 1;
    const shipGoal = Math.min(1, p.total / site.freeShippingMin);
    // Show whichever unlock is closest; once both are done, celebrate the total.
    const showStack = p.nextTier && (p.freeShipping || stackGoal >= shipGoal);
    const progress = p.nextTier || !p.freeShipping ? (showStack ? stackGoal : shipGoal) : 1;
    content = (
      <>
        <Ring value={progress}>
          <motion.span key={count} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
            <Bag />
          </motion.span>
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-pep-mint px-1 text-[11px] font-bold text-pep-blue">{count}</span>
        </Ring>
        <span className="min-w-0 pr-2 text-left leading-tight">
          <span className="block truncate text-sm font-semibold">
            {showStack && p.nextTier
              ? `Add ${p.nextTier.need} more for ${pct(p.nextTier.off)} off`
              : !p.freeShipping
                ? `${money(p.toFreeShipping)} to free shipping`
                : p.off
                  ? `${pct(p.off)} off + free shipping`
                  : "Free shipping unlocked"}
          </span>
          <span className="block text-xs text-white/70">
            {money(p.grandTotal)} · {c?.open ? `same-day if ordered in ${fmtLeft(c.secondsLeft)}` : "view cart"}
          </span>
        </span>
      </>
    );
  } else if (c) {
    key = c.open ? "cutoff" : "bac";
    onClick = () => (path === "/" || path === "/shop" ? scrollToId("shop") : router.push("/shop"));
    content = (
      <>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10">
          <LiveDot className="bg-pep-mint" />
        </span>
        <span className="min-w-0 pr-2 text-left leading-tight">
          <span className="block truncate text-sm font-semibold">
            {c.open ? `Order in ${fmtLeft(c.secondsLeft)}` : "Free BAC water with every order"}
          </span>
          <span className="block text-xs text-white/70">{c.open ? "for same-day Utah delivery" : `Free shipping over $${site.freeShippingMin}`}</span>
        </span>
      </>
    );
  }

  return (
    <AnimatePresence>
      {visible && content && (
        <motion.div
          key="dock"
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          // On product pages the phone buy bar owns the bottom edge, so the dock is desktop-only there.
          className={`fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] sm:bottom-6 sm:right-6 ${productPage ? "hidden md:block" : ""}`}
        >
          <div className="relative">
            <motion.button
              layout
              onClick={onClick}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 rounded-full bg-pep-ink/95 py-1.5 pl-1.5 pr-4 text-white shadow-[0_18px_40px_-12px_rgba(11,15,46,0.55)] ring-1 ring-white/10 backdrop-blur-md"
              aria-label={hasItems ? "Open cart" : "Shop now"}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={key}
                  className="flex min-w-0 items-center gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {content}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            {!hasItems && (
              <button
                onClick={() => {
                  setDismissed(true);
                  try {
                    sessionStorage.setItem(DISMISS_KEY, "1");
                  } catch {}
                }}
                className="absolute -left-2 -top-2 grid size-6 place-items-center rounded-full bg-white text-pep-ink shadow ring-1 ring-black/5"
                aria-label="Dismiss"
              >
                <Close className="size-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
