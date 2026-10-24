import type { Metadata } from "next";
import { studio } from "@/content/business";
import Link from "next/link";
import { Block } from "@/components/layout/ServicePage";
import { CtaBand } from "@/components/ui/CtaBand";
import { FaqList } from "@/components/ui/FaqList";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { Related } from "@/components/ui/Related";
import { rich } from "@/components/ui/Rich";
import { Section } from "@/components/ui/Section";
import { faqsByTag } from "@/content/faq";
import { fabrics } from "@/content/fabrics";
import { breadcrumbs, faqPage, graph, webPage } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const path = "/fabrics";
const title = "Suit Fabrics for Utah's Climate | Summit Customs, Salt Lake City";
const description =
  "A guide to suit cloth for Salt Lake City: weights, weaves and Super numbers for dry summers and snowy winters, and the mills we cut from.";

export const metadata: Metadata = pageMeta({ title, description, path });

export default function FabricsPage() {
  const trail = [{ name: "Fabrics", path }];
  return (
    <>
      <PageHero
        eyebrow="Fabrics"
        trail={trail}
        title={
          <>
            Cloth chosen for <em className="text-gold">altitude, season and use</em>.
          </>
        }
        summary="Salt Lake City sits at about 4,200 feet, with hot, dry summers and cold, snowy winters, so most Utah wardrobes need two cloth weights rather than one. Summit Customs guides every client through weight, weave and fibre before cutting. Light high-twist wools are for May to September, flannels for October to April, and a 270–300 g worsted is the year-round workhorse."
      />

      <Section id="cloths" eyebrow="The cloths" title="Six cloths, and what each one is for" className="!pt-8">
        <ul data-scene="fabric" className="grid gap-px border border-line-soft bg-line-soft md:grid-cols-2 lg:grid-cols-3">
          {fabrics.map((f) => (
            <li key={f.slug} data-fabric={f.slug} className="flex flex-col bg-void p-8">
              <p className="eyebrow">{f.season}</p>
              <h3 className="mt-6 font-display text-3xl text-ivory">{f.name}</h3>
              <p className="mt-1 text-sm text-stone">{f.weight}</p>
              <p className="mt-5 text-ivory-dim">{f.character}</p>
              <p className="mt-4 text-ivory-dim">
                <span className="text-ivory">Best for:</span> {f.bestFor}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Block id="weight" eyebrow="Weight" title="Reading cloth weight">
        <p>
          Cloth is sold by weight: grams per metre (g) in Europe and ounces per yard (oz) in the UK and US.
          Weight affects warmth, drape and how well a suit resists creasing.
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Weight</th>
              <th scope="col">Season in Utah</th>
              <th scope="col">Character</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>230–270 g (8–9.5 oz)</td><td>May–September</td><td>Light and breathable. High-twist yarns resist creasing.</td></tr>
            <tr><td>270–300 g (9.5–10.5 oz)</td><td>Year-round</td><td>The most versatile office weight. Drapes cleanly.</td></tr>
            <tr><td>300–370 g (10.5–13 oz)</td><td>October–April</td><td>Flannels and heavier worsteds, warm with a rich drape.</td></tr>
          </tbody>
        </table>
      </Block>

      <Block id="super" eyebrow="Super numbers" title="What “Super 120s” actually means">
        <p>
          A Super number describes how fine the wool fibre is. Higher numbers mean finer fibre, a softer
          hand and more lustre, but also more delicacy. <strong>Super 100s–130s</strong> is the sweet spot
          for suits worn several times a week. <strong>Super 150s and above</strong> feel beautiful and
          suit occasion wear, and they last longest when rotated rather than worn daily.
        </p>
      </Block>

      <Block id="mills" eyebrow="The mills" title="Where our cloth comes from">
        <p>
          Summit Customs cuts from the cloth books of {rich(studio.mills)}.
          Bring a cloth you love and we will tell you honestly how it will wear.
        </p>
        <p>
          Cloth for your day: see <Link href="/custom-wedding-suits-salt-lake-city">custom wedding suits</Link>.
        </p>
      </Block>

      <Section id="faq" eyebrow="Questions" title="Fabric questions" className="bg-surface">
        <FaqList items={faqsByTag("fabric")} />
      </Section>

      <Related
        items={[
          { href: "/bespoke-suits", label: "Bespoke Suits", description: "From cloth to finished suit." },
          { href: "/process", label: "The Process", description: "When cloth is chosen, and why." },
          { href: "/custom-wedding-suits-salt-lake-city", label: "Wedding Suits", description: "Cloth for your venue and season." },
        ]}
      />
      <CtaBand />
      <JsonLd data={graph(webPage(path, title, description), breadcrumbs(trail), faqPage(faqsByTag("fabric"), path))} />
    </>
  );
}
