import type { Metadata } from "next";
import { Block } from "@/components/layout/ServicePage";
import { LinkButton } from "@/components/ui/Button";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { rich } from "@/components/ui/Rich";
import { business } from "@/content/business";
import { isPh } from "@/lib/ph";
import { breadcrumbs, graph, webPage } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const path = "/contact";
const title = "Contact Summit Customs | Bespoke Tailor in Salt Lake City, UT";
const description =
  "Visit or contact Summit Customs, a bespoke suit and image consulting studio in Salt Lake City, Utah. Address, phone, hours and directions.";

export const metadata: Metadata = pageMeta({ title, description, path });

export default function ContactPage() {
  const trail = [{ name: "Contact", path }];
  const a = business.address;
  return (
    <>
      <PageHero
        eyebrow="Contact"
        trail={trail}
        title={
          <>
            Visit the studio in <em className="text-gold">Salt Lake City</em>.
          </>
        }
        summary="Summit Customs is a private bespoke tailoring and image consulting studio in Salt Lake City, Utah, serving clients across the Wasatch Front, including Park City, Provo, Ogden, Sandy and Draper."
      />

      <section aria-labelledby="details-title" className="container-site">
        <h2 id="details-title" className="sr-only">Studio details</h2>
        <div className="grid gap-px border border-line-soft bg-line-soft md:grid-cols-3">
        <div className="bg-void p-8">
          <p className="eyebrow">Address</p>
          <address className="mt-4 not-italic text-lg text-ivory">
            {business.name}
            <br />
            {rich(a.street)}
            <br />
            {a.locality}, {a.region} {rich(a.postalCode)}
          </address>
          <p className="mt-4 text-ivory-dim">
            {isPh(business.mapUrl) ? rich(business.mapUrl) : <a className="text-gold-bright" href={business.mapUrl}>Open in Google Maps</a>}
          </p>
        </div>
        <div className="bg-void p-8">
          <p className="eyebrow">Phone &amp; email</p>
          <p className="mt-4 text-lg text-ivory">
            {isPh(business.phone) ? rich(business.phone) : <a href={`tel:${business.phoneHref}`}>{business.phone}</a>}
          </p>
          <p className="mt-2 text-lg text-ivory">
            {isPh(business.email) ? rich(business.email) : <a href={`mailto:${business.email}`}>{business.email}</a>}
          </p>
        </div>
        <div className="bg-void p-8">
          <p className="eyebrow">Hours</p>
          <p className="mt-4 text-lg text-ivory">{rich(business.hoursText)}</p>
          <div className="mt-6">
            <LinkButton href="/book" variant="text">
              Book a Private Fitting
            </LinkButton>
          </div>
        </div>
        </div>
      </section>

      <Block id="directions" eyebrow="Getting here" title="Directions & parking">
        <p>
          The studio is at {business.address.street}, in downtown Salt Lake City.{" "}
          <a className="text-gold-bright" href={business.mapUrl}>Get directions in Google Maps</a>. Visits are by
          appointment, so we&rsquo;ll share arrival details when we confirm your time.
        </p>
      </Block>

      <Block id="area" eyebrow="Service area" title="Clients across the Wasatch Front">
        <p>
          The studio is in Salt Lake City. We welcome clients from {business.areaServed.slice(1, -1).join(", ")} and{" "}
          {business.areaServed.at(-1)}. Can&rsquo;t make it in? Consultations are also available by video.
        </p>
      </Block>
      <JsonLd data={graph(webPage(path, title, description), breadcrumbs(trail))} />
    </>
  );
}
