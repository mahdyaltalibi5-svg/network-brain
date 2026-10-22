"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import type { Product } from "@/lib/products";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-pep-ink/8 py-3 last:border-0">
      <span className="text-sm text-pep-ink/60">{label}</span>
      <span className={`text-right font-semibold ${value ? "text-pep-ink" : "text-pep-ink/40"}`}>{value || "Posting soon"}</span>
    </div>
  );
}

// "View COA" link that opens the batch certificate in a sheet instead of leaving the page.
export function CoaButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { coa } = product;

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-pep-blue underline underline-offset-2">
        <span aria-hidden>🧪</span> View COA · Lot {product.lot}
      </button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`${product.name} certificate of analysis`}>
            <motion.div
              className="absolute inset-0 bg-pep-ink/40 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-md rounded-t-[28px] bg-white p-6 pb-10 text-pep-ink shadow-2xl sm:rounded-[28px] sm:pb-6"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-pep-ink/15 sm:hidden" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pep-blue">Certificate of Analysis</p>
              <h2 className="mt-1 font-display text-3xl font-semibold">{product.name}</h2>
              <div className="mt-4 rounded-3xl bg-pep-cloud px-5 py-2">
                <Row label="Lot" value={product.lot} />
                <Row label="Purity (HPLC)" value={coa.purity} />
                <Row label="Identity (mass spec)" value={coa.purity ? "Confirmed" : ""} />
                <Row label="Testing lab" value={coa.lab} />
                <Row label="Test date" value={coa.date} />
              </div>
              <div className="mt-5 flex gap-3">
                {coa.url ? (
                  <a href={coa.url} target="_blank" rel="noreferrer" className="grid h-12 flex-1 place-items-center rounded-full bg-pep-blue font-display font-semibold text-white">
                    Open full PDF
                  </a>
                ) : (
                  <span className="grid h-12 flex-1 place-items-center rounded-full bg-pep-cloud text-sm font-semibold text-pep-ink/50">PDF posting soon</span>
                )}
                <button onClick={() => setOpen(false)} className="h-12 rounded-full px-6 font-display font-semibold ring-2 ring-pep-ink/10">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
