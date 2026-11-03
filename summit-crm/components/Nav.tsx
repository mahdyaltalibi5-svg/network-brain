"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Pipeline" },
  { href: "/ads", label: "Meta ads" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-6 text-sm">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/leads") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={active ? "text-gold" : "text-ivory-dim hover:text-ivory"}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
