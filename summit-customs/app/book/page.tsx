import type { Metadata } from "next";
import { Block } from "@/components/layout/ServicePage";
import { BookingCalendar } from "@/components/ui/BookingCalendar";
import { LinkButton } from "@/components/ui/Button";
import { FactList } from "@/components/ui/FactList";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { rich } from "@/components/ui/Rich";
import { business } from "@/content/business";
import { booking } from "@/lib/booking";
import { isPh } from "@/lib/ph";
import { breadcrumbs, graph, webPage } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const path = "/book";
const title = "Book a Private Fitting in Salt Lake City | Summit Customs";
const description =
  "Book a private bespoke suit consultation or image consulting session at Summit Customs in Salt Lake City. 60–90 minutes, one-to-one, no obligation to commission.";

export const metadata: Metadata = pageMeta({ title, description, path });

export default function BookPage() {
  const trail = [{ name: "Book a Private Fitting", path }];
  return (
    <>
      <PageHero
        eyebrow="Book"
        trail={trail}
        title={
          <>
            Book a <em className="text-gold">Private Fitting</em>.
          </>
        }
        summary="Your first appointment is a private, one-to-one consultation of 60–90 minutes at our Salt Lake City studio. We discuss what you need the suit or wardrobe to do, take measurements if you're ready, and walk through cloth. There is no obligation to commission."
      >
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <LinkButton href="#calendar">{booking.kind === "none" ? "Request a fitting" : "Choose a time"}</LinkButton>
          <p className="text-ivory-dim">
            Or call {isPh(business.phone) ? rich(business.phone) : <a className="text-gold-bright" href={`tel:${business.phoneHref}`}>{business.phone}</a>}
            {" · "}
            {isPh(business.email) ? rich(business.email) : <a className="text-gold-bright" href={`mailto:${business.email}`}>{business.email}</a>}
          </p>
        </div>
      </PageHero>

      <BookingCalendar />

      <section aria-label="Appointment details" className="container-site pb-8">
        <FactList
          className="lg:grid-cols-4"
          facts={[
            ["Length", "60–90 minutes"],
            ["Format", "Private, one-to-one"],
            ["Where", `${business.address.locality} studio`],
            ["Hours", business.hoursText],
          ]}
        />
      </section>

      <Block id="expect" eyebrow="What to expect" title="Your first appointment">
        <ol>
          <li><strong>Conversation:</strong> your work, your calendar, and what the suit or wardrobe must do.</li>
          <li><strong>Direction:</strong> silhouette, details and cloth options, with honest guidance on budget.</li>
          <li><strong>Private measurements:</strong> taken one-on-one, in private, if you&rsquo;re ready to proceed. They stay confidential and your pattern is drafted from them.</li>
          <li><strong>Quote:</strong> confirmed in writing before anything is cut.</li>
        </ol>
        <p>Bring the shoes you plan to wear with the suit, and a shirt you like the fit of.</p>
      </Block>

      <Block id="for" eyebrow="Appointments" title="What you can book">
        <ul>
          <li>Bespoke suit consultation</li>
          <li>Wedding consultation for the groom and the wedding party</li>
          <li>Image consulting session</li>
          <li>Executive wardrobe audit</li>
        </ul>
        <p>Appointment policy: {rich(business.appointmentOnly)}</p>
      </Block>
      <JsonLd data={graph(webPage(path, title, description), breadcrumbs(trail))} />
    </>
  );
}
