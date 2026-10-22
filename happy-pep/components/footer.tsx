import Link from "next/link";
import { Logo } from "./logo";
import { EmailSignup } from "./sections";
import { cities } from "@/lib/cities";
import { disclaimer, site } from "@/lib/site";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All peptides" },
      { href: "/coas", label: "COAs" },
      { href: "/about", label: "About" },
      { href: "/work-with-us", label: "Work with us" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
      { href: "/shipping", label: "Shipping" },
      { href: "/refunds", label: "Refunds" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/refunds", label: "Refund Policy" },
      { href: "/research-use", label: "Research Use Only" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-pep-ink pb-10 pt-14 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <EmailSignup />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" aria-label="Happy Pep home" className="text-4xl">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Research peptides for laboratory use only. Third-party tested, with a certificate of analysis for every lot. Shipped from Utah.
            </p>
          </div>

          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">{c.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-white/75 transition-colors hover:text-pep-mint">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Contact</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              <li>
                <a href={`mailto:${site.email}`} className="break-all transition-colors hover:text-pep-mint">
                  ✉ {site.email}
                </a>
              </li>
              {site.phone && (
                <li>
                  <a href={`tel:${site.phone}`} className="transition-colors hover:text-pep-mint">
                    ☎ {site.phone}
                  </a>
                </li>
              )}
              {site.supportHours && <li>◷ {site.supportHours}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Same-day delivery in</p>
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
        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pep-mint">FDA &amp; regulatory notice</p>
          <div className="mt-3 max-w-3xl space-y-2 text-xs leading-relaxed text-white/50">
            <p>{disclaimer}</p>
            <p>
              Happy Pep sells research chemicals. We are not a pharmacy or compounding facility, and nothing on this site is medical advice. Products are
              not drugs, foods, supplements or cosmetics.
            </p>
            <p>
              By purchasing, you confirm you are 21 or older, that products will be used only for lawful in-vitro research, and that you are responsible for
              complying with the laws where you live. Products may not be available in every jurisdiction.
            </p>
          </div>
        </div>
        <p className="mt-6 text-xs text-white/40">© Happy Pep. All rights reserved.</p>
      </div>
    </footer>
  );
}
