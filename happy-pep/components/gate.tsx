"use client";

import { createContext, useContext, useEffect, useId, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./logo";
import { Button } from "./button";
import { lockScroll, unlockScroll } from "@/lib/scroll";

const KEY = "hp_age_ok";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Runs before first paint: returning visitors (confirmed within 30 days) get
// html[data-age="ok"], which hides the gate in CSS so it never flashes.
export const gateScript = `try{var t=+localStorage.getItem("${KEY}");if(t&&Date.now()-t<${THIRTY_DAYS})document.documentElement.dataset.age="ok"}catch(e){}`;

const EXEMPT = ["/terms", "/privacy"];

const noop = () => () => {};

const EnteredContext = createContext(false);
export const useEntered = () => useContext(EnteredContext);

export function GateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [entered, setEntered] = useState(false);
  const [checked, setChecked] = useState(false);
  const checkId = useId();
  // Legal pages stay readable without passing the gate (it links to them).
  const exempt = EXEMPT.includes(usePathname());
  // Set before paint by gateScript; the server always assumes a new visitor.
  const returning = useSyncExternalStore(
    noop,
    () => document.documentElement.dataset.age === "ok",
    () => false,
  );
  const show = open && !returning && !exempt;

  useEffect(() => {
    if (!show) return;
    const site = document.getElementById("site");
    lockScroll();
    if (site) site.inert = true;
    return () => {
      unlockScroll();
      if (site) site.inert = false;
    };
  }, [show]);

  function enter() {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    document.documentElement.dataset.age = "entered";
    setOpen(false);
  }

  return (
    <EnteredContext.Provider value={entered || returning}>
      {children}
      <AnimatePresence onExitComplete={() => setEntered(true)}>
        {show && (
          <motion.div
            key="gate"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
            className="age-gate fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-pep-blue px-6 text-center text-white"
            exit={{ y: "-100%", opacity: 0.6, transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <Logo stacked draw delay={0.25} className="text-[5.5rem] sm:text-[7rem]" />
            </motion.div>

            <motion.div
              className="mt-8 w-full max-w-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.45 }}
            >
              <h1 id="gate-title" className="font-display text-3xl font-semibold">
                Hey! You must be 21+ to enter.
              </h1>

              <label htmlFor={checkId} className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/10 p-4 text-left text-sm leading-snug">
                <span className="relative mt-0.5 grid size-6 shrink-0 place-items-center">
                  <input
                    id={checkId}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="peer absolute inset-0 cursor-pointer appearance-none rounded-lg border-2 border-white/70 transition-colors checked:border-pep-mint checked:bg-pep-mint focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pep-mint/50"
                  />
                  <svg viewBox="0 0 24 24" className="pointer-events-none relative size-4 text-pep-blue" aria-hidden>
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ pathLength: checked ? 1 : 0 }}
                      transition={{ duration: 0.25 }}
                    />
                  </svg>
                </span>
                <span>
                  I&apos;m 21 or older and agree to the{" "}
                  <a href="/terms" className="underline underline-offset-2">
                    Terms
                  </a>
                  . All products are for research use only.
                </span>
              </label>

              <div className="mt-6 flex flex-col gap-3">
                <Button tone="mint" disabled={!checked} onClick={enter} className="w-full">
                  I&apos;m 21+ — Let&apos;s go
                </Button>
                <a
                  href="https://www.google.com"
                  className="inline-flex h-12 items-center justify-center rounded-full font-display font-semibold text-white/70 ring-2 ring-white/25 transition-colors hover:text-white hover:ring-white/50"
                >
                  Exit
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </EnteredContext.Provider>
  );
}
