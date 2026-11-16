"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = {
  now: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  pipe: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z",
  ads: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  web: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c3 3 3 17 0 20m0-20c-3 3-3 17 0 20M2 12h20",
  set: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
};
const links = [
  { href: "/now", label: "Respond", d: icon.now },
  { href: "/", label: "Pipeline", d: icon.pipe },
  { href: "/ads", label: "Meta ads", d: icon.ads },
  { href: "/website", label: "Website", d: icon.web },
  { href: "/settings", label: "Settings", d: icon.set },
];

function Badge({ n }: { n: number }) {
  return (
    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gradient-to-b from-[#ffb49c] to-[#e2775c] px-1 text-[10px] font-bold text-void shadow-[0_0_12px_rgba(240,165,143,.7)]" aria-label={`${n} waiting`}>
      {n}
    </span>
  );
}

/** Top navigation on desktop; a frosted tab bar along the bottom on phones. */
export function Nav({ waiting = 0, mobile = false }: { waiting?: number; mobile?: boolean }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/leads") : path.startsWith(href));
  if (mobile)
    return (
      <nav aria-label="Main" className="glass grid grid-cols-5 !rounded-[26px] px-1 py-1.5">
        {links.map((l) => {
          const on = isActive(l.href);
          return (
            <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center gap-1 rounded-[20px] py-1.5 text-[10px] tracking-wide transition-colors ${on ? "bg-white/10 text-gold-bright" : "text-ivory-dim"}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"><path d={l.d} /></svg>
              {l.label.replace("Meta ads", "Ads")}
              {l.href === "/now" && waiting > 0 && <span className="absolute top-0.5 right-[22%]"><Badge n={waiting} /></span>}
            </Link>
          );
        })}
      </nav>
    );
  return (
    <nav aria-label="Main" className="flex items-center gap-1 text-sm">
      {links.map((l) => {
        const on = isActive(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-colors ${on ? "bg-white/10 text-gold-bright shadow-[inset_0_1px_0_rgba(255,255,255,.1)]" : "text-ivory-dim hover:bg-white/5 hover:text-ivory"}`}>
            {l.label}
            {l.href === "/now" && waiting > 0 && <Badge n={waiting} />}
          </Link>
        );
      })}
    </nav>
  );
}
