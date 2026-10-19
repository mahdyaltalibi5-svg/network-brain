import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { SITE_URL } from "@/content/business";
import { posts } from "@/content/journal/posts";
import { breadcrumbs, graph, ids, webPage } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const path = "/journal";
const title = "The Journal: Bespoke Tailoring & Style Guides | Summit Customs";
const description =
  "Guides from a Salt Lake City bespoke studio: bespoke vs made-to-measure, custom wedding suit timelines and building an executive capsule wardrobe.";

export const metadata: Metadata = pageMeta({ title, description, path });

const fmt = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default function JournalIndex() {
  const trail = [{ name: "Journal", path }];
  return (
    <>
      <PageHero
        eyebrow="The Journal"
        trail={trail}
        title={
          <>
            Notes from the <em className="text-gold">cutting table</em>.
          </>
        }
        summary="Plain-spoken guides to bespoke tailoring, wedding dress and executive wardrobes, written by the Summit Customs studio in Salt Lake City."
      />
      <section aria-label="Articles" className="container-site pb-28">
        <ul className="border-t border-line-soft">
          {posts.map((p) => (
            <li key={p.slug} className="border-b border-line-soft">
              <article className="group grid gap-6 py-12 md:grid-cols-12">
                <div className="md:col-span-3">
                  <p className="eyebrow">{p.section}</p>
                  <p className="mt-3 text-sm text-ivory-dim">
                    <time dateTime={p.published}>{fmt(p.published)}</time> · {p.readingMinutes} min read
                  </p>
                </div>
                <div className="md:col-span-8">
                  <h2 className="text-[clamp(1.9rem,3.6vw,3.1rem)] text-ivory transition-colors group-hover:text-gold-bright">
                    <Link href={`/journal/${p.slug}`}>{p.title}</Link>
                  </h2>
                  <p className="mt-4 max-w-2xl text-ivory-dim">{p.description}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
      <CtaBand />
      <JsonLd
        data={graph(
          {
            ...webPage(path, title, description),
            "@type": "CollectionPage",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: posts.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: p.title,
                item: `${SITE_URL}/journal/${p.slug}`,
              })),
            },
            publisher: { "@id": ids.org },
          },
          breadcrumbs(trail),
        )}
      />
    </>
  );
}
