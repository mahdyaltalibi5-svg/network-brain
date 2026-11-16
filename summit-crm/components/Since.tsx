"use client";

import { useEffect, useState } from "react";

const fmt = (s: number) => {
  if (s < 3600) return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
};

/** Live "waiting for" clock. Green under 5 minutes, amber under 15, red after. */
export function Since({ iso, className = "" }: { iso: string; className?: string }) {
  const start = new Date(iso).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const t = setInterval(tick, 1000);
    return () => { cancelAnimationFrame(first); clearInterval(t); };
  }, []);
  const s = Math.max(0, ((now ?? start) - start) / 1000);
  const tone = s < 300 ? "text-ok" : s < 900 ? "text-warn" : "text-bad";
  return (
    <span className={`font-mono tabular-nums ${tone} ${className}`} suppressHydrationWarning>
      {now == null ? "–:––" : fmt(s)}
    </span>
  );
}
