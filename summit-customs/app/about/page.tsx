import type { Metadata } from "next";
import { Block } from "@/components/layout/ServicePage";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { Related } from "@/components/ui/Related";
import { rich } from "@/components/ui/Rich";
import { business, founder } from "@/content/business";
import { breadcrumbs, graph, webPage } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const path = "/about";
const title = "About Summit Customs | Bespoke Tailor & Image Consultant, Salt Lake City";
const description =
  "Meet Kobe Apponsah, founder of Summit Customs, a Salt Lake City custom suit and image consulting studio. Our standards and how we work.";

export const metadata: Metadata = pageMeta({ title, description, path });

export default function AboutPage() {
  const trail = [{ name: "About", path }];
  return (
    <>
      <PageHero
        eyebrow="About the studio"
        trail={trail}
        title={
          <>
            Savile Row precision, <em className="text-gold">Wasatch scale</em>.
          </>
        }
        summary={`${business.shortDescription} The studio was founded by ${founder.name}, and pairs custom tailoring with image consulting under one roof.`}
      />

      <section id="founder" aria-labelledby="founder-title" className="py-20 md:py-28">
        <div className="container-site grid gap-14 md:grid-cols-12">
          <div className="md:col-span-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized webp */}
            <img
              src={founder.photo}
              srcSet={`/img/kobe-portrait-640.webp 640w, ${founder.photo} 1100w`}
              sizes="(min-width: 768px) 33vw, 100vw"
              width={1100}
              height={578}
              loading="lazy"
              decoding="async"
              alt={`Portrait of ${founder.name}, founder of Summit Customs, in a midnight tuxedo with satin peak lapels`}
              className="h-auto w-full border border-line-soft"
            />
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <p className="eyebrow">{founder.role}</p>
            <h2 id="founder-title" className="mt-5 text-[clamp(2.4rem,4.6vw,4rem)] text-ivory">
              {rich(founder.name)}
            </h2>
            <div className="prose-site mt-8">
              {founder.bio.map((p) => (
                <p key={p}>{rich(p)}</p>
              ))}
            </div>
            <h3 className="mt-12 font-display text-3xl text-ivory">How Kobe works</h3>
            <ul className="mt-6 space-y-3 border-t border-line-soft pt-6 text-ivory-dim">
              {founder.credentials.map((c) => (
                <li key={c} className="flex gap-4">
                  <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-gold" />
                  <span>{rich(c)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Block id="standards" eyebrow="Standards" title="What we hold ourselves to">
        <ul>
          <li><strong>Your pattern, not a size.</strong> Every bespoke garment starts from a pattern drafted for you.</li>
          <li><strong>Fit on the body, not on paper.</strong> Suits are refined across fittings until they are right.</li>
          <li><strong>Honest advice.</strong> If a cloth won&rsquo;t survive how you plan to wear it, we&rsquo;ll say so.</li>
          <li><strong>No quote surprises.</strong> Pricing is confirmed in writing before anything is cut.</li>
          <li><strong>Built to last.</strong> Inlays are left in the seams so the suit can change with you.</li>
        </ul>
      </Block>

      <Block id="name" eyebrow="The name" title="Why “Summit”">
        <p>
          Salt Lake City lives beneath the Wasatch Range, whose highest peaks top 11,000 feet, close enough
          to frame almost every view in the valley. A summit is earned in stages, with patience and
          precision, and so is a bespoke suit. We named the studio for both.
        </p>
      </Block>

      <Related
        items={[
          { href: "/process", label: "The Process", description: "How we work, step by step." },
          { href: "/bespoke-suits", label: "Bespoke Suits", description: "What every commission includes." },
          { href: "/image-consulting", label: "Image Consulting", description: "Strategy before tailoring." },
        ]}
      />
      <CtaBand />
      <JsonLd data={graph(webPage(path, title, description), breadcrumbs(trail))} />
    </>
  );
}
