"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cutoffState, type CutoffState } from "@/lib/cutoff";

// One digit that rolls like a soft odometer when it changes.
function Digit({ d }: { d: string }) {
  return (
    <span className="relative inline-block h-[1.2em] w-[0.62em] overflow-hidden align-bottom">
      <AnimatePresence initial={false}>
        <motion.span
          key={d}
          className="absolute inset-0 text-center"
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          {d}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Clock({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const text = [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  return (
    <span className="font-display font-semibold tabular-nums text-pep-mint" aria-label={`${h} hours ${m} minutes`}>
      {text.split("").map((c, i) => (c === ":" ? <span key={i}>:</span> : <Digit key={i} d={c} />))}
    </span>
  );
}

export function Countdown() {
  // Time-dependent, so it only renders on the client; the pill keeps its size meanwhile.
  const [state, setState] = useState<CutoffState | null>(null);

  useEffect(() => {
    const tick = () => setState(cutoffState());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <p className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13px] sm:px-5 sm:text-[15px] text-white ring-1 ring-white/15" aria-live="off">
      <span className="relative flex size-2.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-pep-mint opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-pep-mint" />
      </span>
      {!state ? (
        <span className="opacity-0">Order in 00:00:00 for same-day Utah delivery</span>
      ) : state.open ? (
        <span>
          Order in <Clock seconds={state.secondsLeft} /> for same-day Utah delivery
        </span>
      ) : (
        <span>
          Order now — same-day delivery <span className="font-semibold text-pep-mint">{state.next}</span>
        </span>
      )}
    </p>
  );
}
