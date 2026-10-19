import type { ReactNode } from "react";
import type { Faq } from "@/content/faq";
import type { NavItem } from "@/content/nav";
import type { Service } from "@/content/services";
import { LinkButton } from "@/components/ui/Button";
import { CtaBand } from "@/components/ui/CtaBand";
import { FactList } from "@/components/ui/FactList";
import { FaqList } from "@/components/ui/FaqList";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { Related } from "@/components/ui/Related";
import { Section } from "@/components/ui/Section";
import { breadcrumbs, faqPage, graph, service as serviceLd, webPage } from "@/lib/seo/jsonld";

type Props = {
  service: Service;
  eyebrow: string;
  h1: ReactNode;
  facts: [string, string][];
  faqs: Faq[];
  related: NavItem[];
  children: ReactNode;
};

/** Shared frame for service pages: answer-first hero, key facts, body, FAQ, related links, CTA, JSON-LD. */
export function ServicePage({ service, eyebrow, h1, facts, faqs, related, children }: Props) {
  const trail = [{ name: service.name, path: service.path }];
  return (
    <>
      <PageHero eyebrow={eyebrow} title={h1} summary={service.summary} trail={trail}>
        <div className="mt-12 flex flex-wrap gap-4">
          <LinkButton href="/book">Book a Private Fitting</LinkButton>
          <LinkButton href="#faq" variant="ghost">
            Common questions
          </LinkButton>
        </div>
      </PageHero>

      <section aria-label="Key facts" className="container-site pb-8">
        <FactList facts={facts} className="lg:grid-cols-4" />
      </section>

      {children}

      <Section id="faq" eyebrow="Questions" title={`${service.name}: common questions`} className="bg-surface">
        <FaqList items={faqs} />
      </Section>

      <Related title="Related" items={related} />
      <CtaBand />
      <JsonLd
        data={graph(
          webPage(service.path, service.title, service.description),
          serviceLd(service),
          breadcrumbs(trail),
          faqPage(faqs, service.path),
        )}
      />
    </>
  );
}

/** Long-form body block: label column + prose column. */
export function Block({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="py-20 md:py-28">
      <div className="container-site grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="eyebrow">{eyebrow}</p>
          <div className="hairline mt-4 w-24" />
        </div>
        <div className="md:col-span-8">
          <h2 id={`${id}-title`} className="text-[clamp(2.2rem,4.4vw,3.8rem)] text-ivory">
            {title}
          </h2>
          <div className="prose-site mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}
