import type { Metadata } from "next";
import { CtaBand } from "@/components/ui/CtaBand";
import { FaqList } from "@/components/ui/FaqList";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { faqs, type FaqTag } from "@/content/faq";
import { breadcrumbs, faqPage, graph, webPage } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const path = "/faq";
const title = "Custom Suit FAQ: Cost, Timing & Fittings in Salt Lake City | Summit Customs";
const description =
  "Answers to the questions people ask about custom suits in Salt Lake City: cost, bespoke vs made-to-measure, how long it takes, Utah wedding attire and image consulting.";

export const metadata: Metadata = pageMeta({ title, description, path });

const groups: { tag: FaqTag; label: string }[] = [
  { tag: "cost", label: "Cost & value" },
  { tag: "bespoke", label: "Bespoke tailoring" },
  { tag: "wedding", label: "Weddings" },
  { tag: "image", label: "Image consulting" },
  { tag: "executive", label: "Executive wardrobe" },
  { tag: "fabric", label: "Fabrics & climate" },
  { tag: "process", label: "Process & fittings" },
  { tag: "studio", label: "The studio" },
];

export default function FaqPage() {
  const trail = [{ name: "FAQ", path }];
  // Each question appears once, under its first tag.
  const seen = new Set<string>();
  const grouped = groups
    .map((g) => ({
      ...g,
      items: faqs.filter((f) => f.tags[0] === g.tag && !seen.has(f.id) && seen.add(f.id)),
    }))
    .filter((g) => g.items.length);

  return (
    <>
      <PageHero
        eyebrow="Frequently asked"
        trail={trail}
        title={
          <>
            Custom suits in Salt Lake City, <em className="text-gold">answered plainly</em>.
          </>
        }
        summary="The questions clients ask most before commissioning a suit or booking image consulting, answered directly. Studio-specific figures such as prices and lead times are confirmed at your consultation."
      >
        <nav aria-label="FAQ topics" className="mt-12">
          <ul className="flex flex-wrap gap-3">
            {grouped.map((g) => (
              <li key={g.tag}>
                <a href={`#${g.tag}`} className="inline-block border border-line px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ivory-dim hover:border-gold hover:text-ivory">
                  {g.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      {grouped.map((g, i) => (
        <Section key={g.tag} id={g.tag} eyebrow={`${String(i + 1).padStart(2, "0")}`} title={g.label} className={`!py-16 md:!py-24 ${i % 2 ? "bg-surface" : ""}`}>
          <FaqList items={g.items} />
        </Section>
      ))}

      <CtaBand />
      <JsonLd data={graph(webPage(path, title, description), breadcrumbs(trail), faqPage(faqs, path))} />
    </>
  );
}
