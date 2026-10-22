"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./cart";
import { useEntered } from "./gate";
import { useNow, fmtLeft } from "./delivery";
import { Check, Close } from "./icons";
import { cutoffState, delivery, fmtDay } from "@/lib/cutoff";
import { isInStock, money, products } from "@/lib/products";
import { pct, pricing, type Pricing } from "@/lib/pricing";
import { scrollToId } from "@/lib/scroll";
import { site } from "@/lib/site";

const HUSH_KEY = "hp_pep_hushed";

// 0 (empty cart) → 1 (best price + free shipping): how happy Pep is.
function happiness(p: Pricing) {
  if (p.vials === 0) return 0;
  const top = site.stackTiers.at(-1)!.min;
  const stack = Math.min(1, p.vials / top);
  const ship = Math.min(1, p.total / site.freeShippingMin);
  return (stack + ship) / 2;
}

// The mascot: a blue face whose smile widens with the cart, eyes that follow
// the pointer and blink, and cheeks that blush once everything's unlocked.
function PepFace({ mood, bump }: { mood: number; bump: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      setLook({ x: (dx / d) * 2.2, y: (dy / d) * 2.2 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce]);

  // Smile: corners rise and the curve deepens as mood goes up.
  const corner = 37 - mood * 3;
  const depth = 43 + mood * 9;
  const smile = `M19 ${corner} Q32 ${depth} 45 ${corner}`;
  const beaming = mood >= 0.999;

  return (
    <motion.span
      ref={ref}
      key={bump}
      className="relative block size-16"
      initial={bump ? { scale: 0.8, rotate: -8 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 12 }}
    >
      <svg viewBox="0 0 64 64" className="size-16 drop-shadow-[0_14px_24px_rgba(1,37,196,0.45)]" aria-hidden>
        <defs>
          <radialGradient id="pep-face" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#2A4DFF" />
            <stop offset="100%" stopColor="#0125C4" />
          </radialGradient>
        </defs>
        {/* white rim so Pep reads on the blue sections too */}
        <circle cx="32" cy="32" r="31.5" fill="#fff" />
        <circle cx="32" cy="32" r="28.5" fill="url(#pep-face)" />
        {/* eyes: blink every few seconds */}
        <motion.g
          animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
          style={{ transformOrigin: "32px 25px" }}
        >
          {beaming ? (
            <>
              <path d="M19 26 Q23.5 21 28 26" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M36 26 Q40.5 21 45 26" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse cx={23.5 + look.x} cy={25 + look.y} rx="3.4" ry="4.4" fill="#fff" />
              <ellipse cx={40.5 + look.x} cy={25 + look.y} rx="3.4" ry="4.4" fill="#fff" />
            </>
          )}
        </motion.g>
        {/* blush once happy */}
        <motion.g initial={false} animate={{ opacity: mood > 0.6 ? 0.55 : 0 }}>
          <ellipse cx="15" cy="36" rx="4" ry="2.4" fill="#3EF5B9" />
          <ellipse cx="49" cy="36" rx="4" ry="2.4" fill="#3EF5B9" />
        </motion.g>
        <motion.path
          initial={false}
          animate={{ d: smile }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          fill="none"
          stroke="#3EF5B9"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
      </svg>
      {beaming && !reduce && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute size-1.5 rounded-full bg-pep-mint"
              style={{ left: `${[8, 52, 30][i]}px`, top: `${[4, 6, -6][i]}px` }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4], y: [0, -6, -10] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5 }}
              aria-hidden
            />
          ))}
        </>
      )}
    </motion.span>
  );
}

function Bar({ value }: { value: number }) {
  const done = value >= 1;
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pep-ink/8">
      <motion.div
        className={`h-full origin-left rounded-full ${done ? "bg-[#12B886]" : "bg-pep-blue"}`}
        initial={false}
        animate={{ scaleX: Math.max(0.04, Math.min(1, value)) }}
        transition={{ type: "spring", stiffness: 160, damping: 24 }}
      />
    </div>
  );
}

function Perk({ done, title, sub, progress }: { done: boolean; title: React.ReactNode; sub?: React.ReactNode; progress?: number }) {
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${done ? "bg-[#12B886] text-white" : "ring-2 ring-pep-ink/15"}`}>
        {done && <Check className="size-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${done ? "text-pep-ink" : "text-pep-ink/85"}`}>{title}</p>
        {sub && <p className="text-xs text-pep-ink/55">{sub}</p>}
        {progress !== undefined && !done && <Bar value={progress} />}
      </div>
    </li>
  );
}

// Pep: a floating smiley that gets happier as the cart grows, talks about the
// next reward, and opens a perks panel with a one-tap add that unlocks it.
export function SalesDock() {
  const entered = useEntered();
  const { lines, count, ready, isOpen, open: openCart, add } = useCart();
  const path = usePathname();
  const router = useRouter();
  const now = useNow(1000);
  const [panel, setPanel] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [hushed, setHushed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(0);
  const lastCount = useRef(count);
  const lastMsg = useRef("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Session storage is only readable after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHushed(sessionStorage.getItem(HUSH_KEY) === "1");
    } catch {}
    const onScroll = () => setScrolled(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const p = pricing(lines);
  const mood = happiness(p);
  const c = now ? cutoffState(now) : null;
  const d = now ? delivery(now) : null;
  const hasItems = ready && count > 0;

  // What Pep says right now: always the next concrete reward.
  const msg = !now
    ? ""
    : hasItems
      ? p.nextTier
        ? `Add ${p.nextTier.need} more vial${p.nextTier.need > 1 ? "s" : ""} and I'll take ${pct(p.nextTier.off)} off everything.`
        : !p.freeShipping
          ? `You're ${money(p.toFreeShipping)} away from free shipping.`
          : `Best price unlocked: ${pct(p.off)} off + free shipping. Let's go!`
      : c?.open
        ? `Order in ${fmtLeft(c.secondsLeft)} and it's at your door today in Utah.`
        : `Free BAC water with every order. ${pct(site.stackTiers[0].off)} off when you grab ${site.stackTiers[0].min}+.`;
  // Ignore the ticking clock when deciding whether the message is "new".
  const msgKind = msg.replace(/\d+h \d+m|\d+m/g, "");

  // Bounce and speak up whenever the cart changes.
  useEffect(() => {
    if (!ready) return;
    if (count > lastCount.current) setBump((b) => b + 1);
    lastCount.current = count;
  }, [count, ready]);

  useEffect(() => {
    if (!entered || !ready || !msgKind || hushed || panel) return;
    if (!hasItems && !scrolled) return;
    if (msgKind === lastMsg.current) return;
    lastMsg.current = msgKind;
    const show = setTimeout(() => setBubble(true), hasItems ? 500 : 1200);
    const hide = setTimeout(() => setBubble(false), hasItems ? 7000 : 8000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [msgKind, entered, ready, hushed, panel, hasItems, scrolled]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    const onDown = (e: PointerEvent) => !panelRef.current?.contains(e.target as Node) && setPanel(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [panel]);

  // One-tap suggestion: the cheapest in-stock vial not already in the cart.
  const inCart = new Set(lines.map((l) => l.slug));
  const suggestion = products
    .filter((x) => isInStock(x) && !inCart.has(x.slug))
    .map((x) => ({ product: x, size: x.sizes.filter((s) => s.inStock).sort((a, b) => a.price - b.price)[0] }))
    .sort((a, b) => a.size.price - b.size.price)[0];
  const unlocks = p.nextTier && p.nextTier.need === 1 ? `unlocks ${pct(p.nextTier.off)} off` : p.vials === 0 ? "free BAC water included" : "gets you closer";

  const hiddenHere = path.startsWith("/checkout") || ["/terms", "/privacy", "/research-use"].includes(path);
  const visible = entered && ready && !isOpen && !hiddenHere && !!now;
  // On phones the product-page buy bar owns the bottom edge, so Pep sits higher there.
  const lift = path.startsWith("/p/") ? "bottom-24 md:bottom-6" : "bottom-4 sm:bottom-6";

  const shop = () => {
    setPanel(false);
    if (path === "/" || path === "/shop") scrollToId("shop");
    else router.push("/shop");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pep"
          ref={panelRef}
          initial={{ opacity: 0, y: 30, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.6 }}
          className={`fixed right-4 z-40 flex flex-col items-end sm:right-6 ${lift}`}
        >
          {/* Perks panel */}
          <AnimatePresence>
            {panel && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                style={{ transformOrigin: "bottom right" }}
                className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-[28px] bg-white p-5 text-pep-ink shadow-[0_30px_70px_-20px_rgba(11,15,46,0.5)] ring-1 ring-black/5"
                role="dialog"
                aria-label="Your perks"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold">{mood >= 0.999 ? "You maxed out your perks!" : hasItems ? "Make Pep happier" : "Hey, I'm Pep!"}</p>
                    <p className="text-sm text-pep-ink/60">{hasItems ? "Every perk you unlock comes off at checkout." : "Here's what every order gets you."}</p>
                  </div>
                  <button onClick={() => setPanel(false)} className="grid size-8 shrink-0 place-items-center rounded-full bg-pep-cloud" aria-label="Close">
                    <Close className="size-4" />
                  </button>
                </div>

                <ul className="mt-4 space-y-3.5">
                  <Perk done title="Free BAC water" sub="Added to every order automatically" />
                  {site.stackTiers.map((t) => (
                    <Perk
                      key={t.min}
                      done={p.vials >= t.min}
                      title={`${pct(t.off)} off everything at ${t.min}+ vials`}
                      sub={p.vials >= t.min ? "Unlocked" : `${t.min - p.vials} more to go`}
                      progress={p.vials / t.min}
                    />
                  ))}
                  <Perk
                    done={p.freeShipping}
                    title={`Free shipping over ${money(site.freeShippingMin)}`}
                    sub={p.freeShipping ? "Unlocked" : hasItems ? `${money(p.toFreeShipping)} to go` : `Otherwise ${money(site.shippingRate)} flat`}
                    progress={p.total / site.freeShippingMin}
                  />
                  <Perk
                    done={false}
                    title={c?.open ? <>Same-day Utah: order in {fmtLeft(c.secondsLeft)}</> : <>Next same-day Utah delivery {d ? fmtDay(d.shipDay) : ""}</>}
                    sub={d ? `Everywhere else: by ${fmtDay(d.guaranteedBy)} or shipping's free` : undefined}
                  />
                </ul>

                {suggestion && (p.nextTier || !p.freeShipping) && (
                  <button
                    onClick={() => add(suggestion.product.slug, suggestion.size.label)}
                    className="group mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-pep-cloud px-4 py-3 text-left transition-colors hover:bg-pep-blue/10"
                  >
                    <span>
                      <span className="block text-sm font-semibold">
                        Add {suggestion.product.name} {suggestion.size.label} · {money(suggestion.size.price)}
                      </span>
                      <span className="block text-xs text-pep-blue">One tap, {unlocks}</span>
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pep-blue text-lg leading-none text-white transition-transform group-hover:scale-110">
                      +
                    </span>
                  </button>
                )}

                <div className="mt-4 flex gap-2">
                  {hasItems ? (
                    <>
                      <Link href="/checkout" onClick={() => setPanel(false)} className="grid h-12 flex-1 place-items-center rounded-full bg-pep-blue font-display font-semibold text-white">
                        Checkout · {money(p.grandTotal)}
                      </Link>
                      <button
                        onClick={() => {
                          setPanel(false);
                          openCart();
                        }}
                        className="h-12 rounded-full px-4 font-display font-semibold text-pep-blue ring-2 ring-pep-blue/20"
                      >
                        Cart
                      </button>
                    </>
                  ) : (
                    <button onClick={shop} className="h-12 flex-1 rounded-full bg-pep-blue font-display font-semibold text-white">
                      Shop peptides
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            {/* Speech bubble */}
            <AnimatePresence>
              {bubble && !panel && (
                <motion.div
                  initial={{ opacity: 0, x: 10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  style={{ transformOrigin: "right bottom" }}
                  className="relative mb-2 max-w-[15.5rem] rounded-2xl rounded-br-md bg-white py-2.5 pl-3.5 pr-8 text-sm font-medium leading-snug text-pep-ink shadow-[0_16px_40px_-14px_rgba(11,15,46,0.45)] ring-1 ring-black/5"
                  role="status"
                >
                  <button onClick={() => setPanel(true)} className="text-left">
                    {msg}
                  </button>
                  <button
                    onClick={() => {
                      setBubble(false);
                      setHushed(true);
                      try {
                        sessionStorage.setItem(HUSH_KEY, "1");
                      } catch {}
                    }}
                    className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full text-pep-ink/40 hover:bg-pep-cloud hover:text-pep-ink"
                    aria-label="Hide messages"
                  >
                    <Close className="size-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The face */}
            <motion.button
              onClick={() => {
                setBubble(false);
                setPanel((o) => !o);
              }}
              whileHover={{ y: -3, rotate: -6 }}
              whileTap={{ scale: 0.92 }}
              className="relative rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pep-mint/60"
              aria-label={panel ? "Close perks" : "Open perks"}
              aria-expanded={panel}
            >
              <PepFace mood={mood} bump={bump} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute -right-0.5 -top-0.5 grid h-6 min-w-6 place-items-center rounded-full bg-pep-mint px-1 text-xs font-bold text-pep-blue ring-2 ring-white"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
