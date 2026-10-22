import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/trust";
import { SplitHeading } from "@/components/motion";
import { FAQ } from "@/lib/faq";

export const metadata: Metadata = { title: "FAQ · Happy Pep", description: "Answers about Happy Pep research peptides: quality, COAs, storage, shipping and compliance." };

export default function FaqPage() {
  return (
    <section className="pb-20 pt-10 md:pt-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-blue">Support</p>
          <SplitHeading as="h1" text="Frequently asked questions" className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl" />
        </div>
        <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label="FAQ sections">
          {FAQ.map((g) => (
            <a key={g.title} href={`#${g.title.toLowerCase().replace(/\W+/g, "-")}`} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-pep-ink/70 ring-1 ring-pep-ink/10 hover:ring-pep-blue">
              {g.title}
            </a>
          ))}
        </nav>
        <div className="mt-12 space-y-12">
          {FAQ.map((g) => (
            <div key={g.title} id={g.title.toLowerCase().replace(/\W+/g, "-")} className="scroll-mt-32">
              <div className="mb-4 flex items-center gap-3">
                <span className="font-display text-sm font-semibold tabular-nums text-pep-blue">{String(FAQ.indexOf(g) + 1).padStart(2, "0")}</span>
                <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-pep-blue">{g.title}</h2>
                <span className="h-px flex-1 bg-pep-ink/10" aria-hidden />
                {g.title === "Product quality" && (
                  <Link href="/coas" className="rounded-full px-3 py-1 text-xs font-semibold text-pep-blue ring-1 ring-pep-blue/25">
                    View COAs
                  </Link>
                )}
              </div>
              <FaqList items={g.items} firstOpen={false} />
            </div>
          ))}
        </div>
        <p className="mt-14 text-center text-pep-ink/65">
          Still stuck?{" "}
          <Link href="/contact" className="font-semibold text-pep-blue underline underline-offset-2">
            Contact us
          </Link>
        </p>
      </div>
    </section>
  );
}
