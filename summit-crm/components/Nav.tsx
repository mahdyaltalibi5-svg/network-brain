"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/now", label: "Respond" },
  { href: "/", label: "Pipeline" },
  { href: "/ads", label: "Meta ads" },
  { href: "/website", label: "Website" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ waiting = 0 }: { waiting?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="-mx-1 flex max-w-full gap-5 overflow-x-auto px-1 text-sm whitespace-nowrap">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/leads") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-1.5 ${active ? "text-gold" : "text-ivory-dim hover:text-ivory"}`}>
            {l.label}
            {l.href === "/now" && waiting > 0 && (
              <span className="rounded-full bg-bad px-1.5 text-[11px] leading-[18px] font-semibold text-void" aria-label={`${waiting} waiting`}>
                {waiting}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
