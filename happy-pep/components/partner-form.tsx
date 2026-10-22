"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/lib/site";

const TRACKS = {
  lab: {
    label: "I'm a lab / bulk buyer",
    title: "Labs & wholesale",
    points: ["Volume pricing on 10+ vials, mix & match", "Batch-matched COAs for every lot you receive", "Same-day delivery across our Utah zones", "Invoicing for qualified accounts"],
    fields: [
      { name: "organization", label: "Lab or company", required: true },
      { name: "volume", label: "Expected monthly volume (vials)", required: false },
    ],
  },
  creator: {
    label: "I'm a creator",
    title: "Creator partners",
    points: ["Commission on referred orders", "Early access to new lots", "Content must follow our research-use rules: no dosing, results or human-use claims", "Every application is reviewed by hand"],
    fields: [
      { name: "handle", label: "TikTok / Instagram handle", required: true },
      { name: "audience", label: "Audience size", required: false },
    ],
  },
} as const;

const field = "w-full rounded-2xl bg-white px-4 py-3.5 text-pep-ink ring-1 ring-pep-ink/10 placeholder:text-pep-ink/40 focus:outline-none focus:ring-2 focus:ring-pep-blue";

export function PartnerForm() {
  const [track, setTrack] = useState<keyof typeof TRACKS>("lab");
  const t = TRACKS[track];

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body = Object.entries(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    location.href = `mailto:${site.email}?subject=${encodeURIComponent(`Partner application: ${t.title}`)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div>
      <div className="mx-auto flex max-w-md rounded-full bg-white p-1 ring-1 ring-pep-ink/10" role="tablist">
        {(Object.keys(TRACKS) as (keyof typeof TRACKS)[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={track === k}
            onClick={() => setTrack(k)}
            className={`relative flex-1 rounded-full py-2.5 text-sm font-semibold ${track === k ? "text-white" : "text-pep-ink/70"}`}
          >
            {track === k && <motion.span layoutId="partner-tab" className="absolute inset-0 rounded-full bg-pep-blue" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative">{TRACKS[k].label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={track}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]"
        >
          <div className="rounded-3xl bg-white p-6 ring-1 ring-pep-ink/8">
            <h2 className="font-display text-2xl font-semibold">{t.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-pep-ink/75">
              {t.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-pep-blue" aria-hidden>
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input name="name" required placeholder="Your name" className={field} />
            <input name="email" type="email" required placeholder="Email" className={field} />
            {t.fields.map((f) => (
              <input key={f.name} name={f.name} required={f.required} placeholder={f.label} className={field} />
            ))}
            <textarea name="message" rows={4} placeholder="Anything else we should know?" className={field} />
            <button className="h-14 w-full rounded-full bg-pep-blue font-display text-lg font-semibold text-white transition-transform active:scale-[0.97]">Apply now</button>
            <p className="text-center text-xs text-pep-ink/50">Opens your email app with your application filled in.</p>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
