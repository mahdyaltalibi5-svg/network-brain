"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNav() {
  const path = usePathname();
  if (path === "/admin/login") return null;
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-[#EEF1FD] text-pep-blue" : "text-[#6B7085] hover:bg-[#F0F2F8]"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
