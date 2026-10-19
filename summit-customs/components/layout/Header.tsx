import Link from "next/link";
import { primaryNav, secondaryNav } from "@/content/nav";
import { Logo } from "@/components/ui/Logo";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line-soft bg-void/80 backdrop-blur-md">
      <div className="container-site flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" aria-label="Summit Customs — home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-7 text-[0.74rem] font-medium uppercase tracking-[0.16em] text-ivory-dim">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-gold-bright">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/book"
            className="hidden border border-gold/70 px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-gold hover:text-void sm:inline-block"
            data-magnetic
          >
            Book a Fitting
          </Link>

          {/* No-JS mobile menu */}
          <details className="group relative xl:hidden">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <span aria-hidden="true" className="flex w-6 flex-col gap-[6px]">
                <span className="h-px w-full bg-ivory transition-transform group-open:translate-y-[3.5px] group-open:rotate-45" />
                <span className="h-px w-full bg-ivory transition-transform group-open:-translate-y-[3.5px] group-open:-rotate-45" />
              </span>
            </summary>
            <nav
              aria-label="Mobile"
              className="fixed inset-x-0 top-[4.5rem] h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line-soft bg-void px-[var(--gutter)] py-10"
            >
              <ul className="space-y-1">
                {[...primaryNav, ...secondaryNav].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block border-b border-line-soft py-4 font-display text-3xl text-ivory hover:text-gold-bright"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
