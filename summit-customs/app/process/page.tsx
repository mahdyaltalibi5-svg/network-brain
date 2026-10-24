import type { Metadata } from "next";
import { Block } from "@/components/layout/ServicePage";
import { CtaBand } from "@/components/ui/CtaBand";
import { FaqList } from "@/components/ui/FaqList";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { Related } from "@/components/ui/Related";
import { rich } from "@/components/ui/Rich";
import { Section } from "@/components/ui/Section";
import { faqsByTag } from "@/content/faq";
import { processSteps } from "@/content/process";
import { breadcrumbs, faqPage, graph, webPage } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const path = "/process";
const title = "The Bespoke Process: Consultation to Final Fitting | Summit Customs";
const description =
  "How a Summit Customs bespoke suit is made in Salt Lake City: consultation, measurements, fabric, construction and final fitting, with typical timings for each step.";

export const metadata: Metadata = pageMeta({ title, description, path });

export default function ProcessPage() {
  const trail = [{ name: "Process", path }];
  const faqs = faqsByTag("process");
  return (
    <>
      <PageHero
        eyebrow="The Process"
        trail={trail}
        title={
          <>
            Five steps. <em className="text-gold">No shortcuts.</em>
          </>
        }
        summary="Every Summit Customs suit follows the same five-step ascent: consultation, private measurements, fabric, construction and final fitting. Across the trade, a bespoke suit typically takes 6–12 weeks from first consultation to collection, because it is fitted on your body between stages. Nothing is cut until you have approved the cloth, the design and the price."
      />

      <section aria-label="Process steps" className="container-site pb-24">
        <ol data-scene="process" className="border-t border-line-soft">
          {processSteps.map((s) => (
            <li key={s.slug} id={s.slug} data-camp={s.n} className="grid gap-6 border-b border-line-soft py-14 md:grid-cols-12">
              <div className="md:col-span-4">
                <span className="font-display text-7xl leading-none text-gold">{String(s.n).padStart(2, "0")}</span>
                <h2 className="mt-6 text-5xl text-ivory">{s.name}</h2>
                <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone">{rich(s.duration)}</p>
              </div>
              <div className="prose-site md:col-span-7 md:col-start-6">
                <p className="text-lg text-ivory">{rich(s.summary)}</p>
                <ul>
                  {s.detail.map((d) => (
                    <li key={d}>{rich(d)}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Block id="bring" eyebrow="Preparing" title="What to bring to your first appointment">
        <ul>
          <li>The shoes you plan to wear with the suit, because they change trouser length and posture.</li>
          <li>A shirt whose collar and sleeve length you like.</li>
          <li>Photographs of looks you admire, and of any suit that has always felt right.</li>
          <li>Key dates: a wedding, a trial, a launch or a keynote, so we can plan the fittings backwards.</li>
        </ul>
      </Block>

      <Section id="faq" eyebrow="Questions" title="Process questions" className="bg-surface">
        <FaqList items={faqs} />
      </Section>

      <Related
        items={[
          { href: "/bespoke-suits", label: "Bespoke Suits", description: "What every commission includes." },
          { href: "/fabrics", label: "Fabrics", description: "Choosing cloth at step three." },
          { href: "/book", label: "Book a Fitting", description: "Begin with a private consultation." },
        ]}
      />
      <CtaBand />
      <JsonLd data={graph(webPage(path, title, description), breadcrumbs(trail), faqPage(faqs, path))} />
    </>
  );
}
