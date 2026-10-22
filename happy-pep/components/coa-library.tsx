"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CoaActions } from "./coa";
import { CATEGORIES, products } from "@/lib/products";

// Searchable, filterable COA library: every product, every size.
export function CoaLibrary() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter((p) => (cat === "All" || p.category === cat) && (!n || `${p.name} ${p.category}`.toLowerCase().includes(n)));
  }, [q, cat]);

  return (
    <section className="pb-20 pt-10 md:pt-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-blue">Documentation</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Certificates of Analysis</h1>
          <p className="mx-auto mt-3 max-w-lg text-pep-ink/65">
            Independent lab results for every product and size: HPLC purity and mass spec identity. Match the batch number on your vial.
          </p>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search COAs…"
          aria-label="Search COAs"
          className="mx-auto mt-8 block h-12 w-full max-w-md rounded-full bg-white px-5 text-sm outline-none ring-1 ring-pep-ink/10 focus:ring-2 focus:ring-pep-blue"
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${cat === c ? "bg-pep-blue text-white" : "bg-white text-pep-ink/70 ring-1 ring-pep-ink/10 hover:ring-pep-blue"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-10 space-y-8">
          {shown.length === 0 && <p className="text-center text-pep-ink/50">No matches.</p>}
          {shown.map((p) => (
            <motion.div key={p.slug} id={p.slug} layout className="scroll-mt-32">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                <span className="text-xs font-semibold uppercase tracking-wider text-pep-blue">{p.category}</span>
                <span className="h-px flex-1 bg-pep-ink/10" aria-hidden />
              </div>
              <ul className="space-y-2">
                {p.sizes.map((s) => (
                  <li key={s.label} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-pep-ink/8">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-pep-cloud text-pep-blue" aria-hidden>
                        🧪
                      </span>
                      <div>
                        <p className="text-sm font-semibold uppercase">{s.label} COA</p>
                        <p className="text-xs text-pep-ink/50">
                          {s.coa ? `${s.coa.purity ? `Purity ${s.coa.purity} · ` : ""}Batch ${s.coa.batch} · Tested ${s.coa.tested}` : "Third-party testing in progress"}
                        </p>
                      </div>
                    </div>
                    <CoaActions coa={s.coa} small />
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
