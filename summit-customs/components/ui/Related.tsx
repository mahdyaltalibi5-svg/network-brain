import Link from "next/link";
import type { NavItem } from "@/content/nav";

export function Related({ title = "Continue", items }: { title?: string; items: NavItem[] }) {
  return (
    <nav aria-label={title} className="container-site py-20">
      <p className="eyebrow">{title}</p>
      <ul className="mt-8 grid gap-px border border-line-soft bg-line-soft md:grid-cols-3">
        {items.map((it) => (
          <li key={it.href} className="bg-void">
            <Link href={it.href} className="group block h-full p-8 transition-colors hover:bg-surface">
              <span className="font-display text-3xl text-ivory group-hover:text-gold-bright">{it.label}</span>
              {it.description && <span className="mt-3 block text-ivory-dim">{it.description}</span>}
              <span aria-hidden="true" className="mt-6 block text-gold">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
