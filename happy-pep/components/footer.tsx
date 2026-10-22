import Link from "next/link";
import { Logo } from "./logo";
import { EmailSignup } from "./sections";
import { cities } from "@/lib/cities";
import { disclaimer, site } from "@/lib/site";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/shipping", label: "Shipping Policy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/coas", label: "COAs" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="bg-pep-ink pb-10 pt-14 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" aria-label="Happy Pep home" className="text-4xl">
              <Logo />
            </Link>
            <p className="mt-3 text-sm text-white/60">Research peptides, shipped from Utah.</p>
            <a href={`mailto:${site.email}`} className="mt-1 block text-sm text-white/80 underline underline-offset-2">
              {site.email}
            </a>
            <EmailSignup />
          </div>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/70 transition-colors hover:text-pep-mint">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Same-day delivery in</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link href={`/utah/${c.slug}`} className="text-white/60 transition-colors hover:text-pep-mint">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/50">{disclaimer}</p>
        <p className="mt-3 text-xs text-white/40">© Happy Pep</p>
      </div>
    </footer>
  );
}
