"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cutoffState, delivery, fmtDay } from "@/lib/cutoff";
import { getZip, setZip, subscribeZip, zoneFor, type ZipZone } from "@/lib/zip";

// Current time, ticking on the client only (null during SSR/hydration).
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useZip() {
  return useSyncExternalStore(subscribeZip, getZip, () => "");
}

export function fmtLeft(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type Promise_ = { icon: string; text: React.ReactNode; tone: "mint" | "blue" | "muted" };

export function promiseFor(zone: ZipZone | null, now: Date): Promise_ {
  const d = delivery(now);
  const c = cutoffState(now);
  const left = c.open ? fmtLeft(c.secondsLeft) : "";
  const shipDay = d.shipsToday ? "today" : fmtDay(d.shipDay);

  if (zone === "excluded") return { icon: "🚫", tone: "muted", text: "We don't ship to AK, HI or U.S. territories yet." };
  if (zone === "sameday") {
    return c.open
      ? { icon: "⚡", tone: "mint", text: <>Order in <b>{left}</b> → at your door <b>today</b></> }
      : { icon: "⚡", tone: "mint", text: <>Same-day delivery <b>{fmtDay(d.shipDay)}</b> · order by noon</> };
  }
  return {
    icon: "📦",
    tone: "blue",
    text: (
      <>
        {c.open ? <>Order in <b>{left}</b> → ships today. </> : <>Ships <b>{shipDay}</b>. </>}
        Get it by <b>{fmtDay(d.guaranteedBy)}</b> or shipping&apos;s free
      </>
    ),
  };
}

// One-line delivery promise for product pages and the cart, based on the saved ZIP.
export function DeliveryPromise({ className = "" }: { className?: string }) {
  const now = useNow(15000);
  const zip = useZip();
  if (!now) return <p className={`min-h-12 rounded-2xl ${className}`} />;
  const p = promiseFor(zoneFor(zip), now);
  const tones = { mint: "bg-pep-mint/15 text-pep-ink", blue: "bg-pep-blue/8 text-pep-ink", muted: "bg-pep-ink/5 text-pep-ink/70" };
  return (
    <p className={`flex min-h-12 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm ${tones[p.tone]} ${className}`}>
      <span aria-hidden>{p.icon}</span>
      <span>{p.text}</span>
    </p>
  );
}

const RESULTS: Record<ZipZone, { title: string; sub: (d: ReturnType<typeof delivery>) => string; icon: string; good: boolean }> = {
  sameday: { icon: "⚡", good: true, title: "Same-day delivery available!", sub: (d) => (d.shipsToday ? "Order before noon and it's at your door today." : `Order now and it arrives ${fmtDay(d.shipDay)}.`) },
  utah: { icon: "🏔️", good: true, title: "Ships from Utah, fast", sub: (d) => `Guaranteed by ${fmtDay(d.guaranteedBy)}, or shipping's free.` },
  usa: { icon: "📦", good: true, title: "5-day guarantee applies", sub: (d) => `Get it by ${fmtDay(d.guaranteedBy)}, or shipping's free.` },
  excluded: { icon: "🚫", good: false, title: "Not yet, sorry!", sub: () => "We don't ship to AK, HI or U.S. territories yet." },
};

export function ZipChecker({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const saved = useZip();
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const id = useId();
  const zip = editing ? value : saved || value;
  const zone = zoneFor(zip);
  const now = useNow(30000);

  function onChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 5);
    setValue(digits);
    if (digits.length === 5 && zoneFor(digits)) {
      setZip(digits);
      setEditing(false);
    }
  }

  const r = zone && now ? RESULTS[zone] : null;

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {r && !editing ? (
          <motion.div
            key={`r-${zip}`}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className={`flex items-center gap-3 rounded-3xl p-4 ${r.good ? "bg-pep-mint text-pep-blue" : dark ? "bg-white/10 text-white" : "bg-pep-ink/5 text-pep-ink"}`}
            role="status"
          >
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.08 }}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/60 text-xl"
              aria-hidden
            >
              {r.icon}
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold leading-tight">{r.title}</p>
              <p className="text-sm opacity-80">{r.sub(delivery(now!))}</p>
              <button
                onClick={() => {
                  setValue("");
                  setEditing(true);
                }}
                className="mt-1 text-xs font-semibold underline underline-offset-2 opacity-80"
              >
                ZIP {zip} · change
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.label
            key="input"
            htmlFor={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={`flex items-center gap-3 rounded-3xl p-2 pl-5 ring-1 ${dark ? "bg-white/10 text-white ring-white/20" : "bg-white text-pep-ink ring-pep-ink/10"}`}
          >
            <span aria-hidden>📍</span>
            <span className="sr-only">Enter your ZIP code to check delivery speed</span>
            <input
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="Enter ZIP: how fast can I get it?"
              className={`h-11 min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none ${dark ? "placeholder:text-white/60" : "placeholder:text-pep-ink/45"}`}
            />
            <span className={`grid h-11 shrink-0 place-items-center rounded-full px-4 font-display text-sm font-semibold ${dark ? "bg-pep-mint text-pep-blue" : "bg-pep-blue text-white"}`}>
              {value.length}/5
            </span>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}
