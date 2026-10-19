import Link from "next/link";
import { business } from "@/content/business";
import { primaryNav, secondaryNav, servicesNav } from "@/content/nav";
import { Logo } from "@/components/ui/Logo";
import { rich } from "@/components/ui/Rich";
import { isPh } from "@/lib/ph";

export function Footer() {
  const a = business.address;
  return (
    <footer className="border-t border-line-soft bg-void pt-20 pb-10" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Summit Customs studio information
      </h2>
      <div className="container-site grid gap-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-6 max-w-sm text-ivory-dim">{business.shortDescription}</p>
        </div>

        <div className="md:col-span-3">
          <p className="eyebrow">Studio</p>
          <address className="mt-5 not-italic text-ivory-dim">
            <span className="block text-ivory">{business.name}</span>
            <span className="block">{rich(a.street)}</span>
            <span className="block">
              {a.locality}, {a.region} {rich(a.postalCode)}
            </span>
            <span className="mt-3 block">
              {isPh(business.phone) ? rich(business.phone) : <a href={`tel:${business.phoneHref}`}>{business.phone}</a>}
            </span>
            <span className="block">
              {isPh(business.email) ? (
                rich(business.email)
              ) : (
                <a href={`mailto:${business.email}`}>{business.email}</a>
              )}
            </span>
          </address>
          <p className="mt-4 text-sm text-ivory-dim">
            <span className="text-ivory">Hours:</span> {rich(business.hoursText)}
          </p>
        </div>

        <nav aria-label="Services" className="md:col-span-2">
          <p className="eyebrow">Services</p>
          <ul className="mt-5 space-y-2 text-ivory-dim">
            {servicesNav.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="hover:text-gold-bright">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Studio links" className="md:col-span-3">
          <p className="eyebrow">Explore</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-ivory-dim">
            {[...primaryNav.filter((n) => !servicesNav.some((s) => s.href === n.href)), ...secondaryNav].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-gold-bright">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="container-site mt-16 flex flex-col gap-4 border-t border-line-soft pt-8 text-sm text-ivory-dim md:flex-row md:items-center md:justify-between">
        <p>
          Serving {business.areaServed.slice(0, -1).join(", ")} and {business.areaServed.at(-1)}, Utah.
        </p>
        <p>
          © {business.name}. Bespoke suits &amp; image consulting, Salt Lake City.
        </p>
      </div>
    </footer>
  );
}
