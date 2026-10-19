import type { Metadata } from "next";
import { studio } from "@/content/business";
import Link from "next/link";
import { Block, ServicePage } from "@/components/layout/ServicePage";
import { Ph, rich } from "@/components/ui/Rich";
import { faqsByTag } from "@/content/faq";
import { services } from "@/content/services";
import { pageMeta } from "@/lib/seo/metadata";

const s = services.wedding;

export const metadata: Metadata = pageMeta({
  title: s.title,
  description: s.description,
  path: s.path,
  keywords: ["custom wedding suits Utah", "wedding suits Salt Lake City", "custom tuxedo Salt Lake City", "groomsmen suits Utah"],
});

const timeline: [string, string][] = [
  ["6 months out", "Consultation and measurements for the groom. Groomsmen measured if the party is coordinated."],
  ["5 months out", "Cloth, colour and style confirmed against the venue, season and the wedding's palette."],
  ["4 months out", "First (baste) fitting. Shape and balance are set on your body."],
  ["2–3 months out", "Forward fitting. Sleeves, collar and trousers refined."],
  ["2–3 weeks out", "Final fitting, timed close to the day so your fit reflects any training or weight change."],
  ["Wedding week", "Collected, pressed and ready, with accessories confirmed."],
];

export default function WeddingSuitsPage() {
  return (
    <ServicePage
      service={s}
      eyebrow="Custom Wedding Suits · Salt Lake City & Utah"
      h1={
        <>
          Custom wedding suits for Utah grooms, <em className="text-gold">from valley to summit</em>.
        </>
      }
      facts={[
        ["When to start", "4–6 months before"],
        ["Wedding party", "Start 6 months out"],
        ["Final fitting", "2–3 weeks before the day"],
        ["Groom's suit from", s.priceFrom],
      ]}
      faqs={faqsByTag("wedding")}
      related={[
        {
          href: "/journal/custom-wedding-suit-timeline",
          label: "Wedding Suit Timeline",
          description: "When to start and what to expect, month by month.",
        },
        { href: "/fabrics", label: "Fabrics", description: "Cloth for mountain evenings and valley summers." },
        { href: "/bespoke-suits", label: "Bespoke Suits", description: "How every Summit suit is made." },
      ]}
    >
      <Block id="timeline" eyebrow="Timeline" title="Your wedding suit, month by month">
        <p>
          A custom wedding suit is built in stages, so the calendar matters. Utah&rsquo;s peak wedding
          season runs from May through October, and studio diaries fill early, so most grooms begin about
          six months before the date.
        </p>
        <ol className="!list-none !pl-0">
          {timeline.map(([when, what]) => (
            <li key={when} className="grid gap-1 border-t border-line-soft py-4 md:grid-cols-[11rem_1fr] md:gap-6">
              <strong className="font-display text-xl !font-medium text-gold-bright">{when}</strong>
              <span>{what}</span>
            </li>
          ))}
        </ol>
        <p>
          Short on time? {rich(studio.rush)}. Read the full{" "}
          <Link href="/journal/custom-wedding-suit-timeline">custom wedding suit timeline</Link>.
        </p>
      </Block>

      <Block id="venues" eyebrow="Venue & season" title="Dressing for a Utah wedding">
        <h3>Mountain ceremonies: Park City, Deer Valley, the Cottonwoods</h3>
        <p>
          At 7,000 feet and above, sunshine is intense and evenings turn cold quickly. Temperatures often
          fall 20°F or more after sunset. A mid-weight wool of 260–300 g in navy, mid-grey or a soft earth
          tone handles both. Consider a waistcoat you can wear on its own once the dancing starts.
        </p>
        <h3>Valley summer receptions: Salt Lake City, Sandy, Draper, Provo</h3>
        <p>
          July afternoons in the valley regularly pass 95°F. High-twist wool, fresco or a wool–linen blend
          at 230–270 g breathes and resists creasing. Lighter blues, stone and tan read well in bright
          daylight photography.
        </p>
        <h3>Temple sealings and ring ceremonies</h3>
        <p>
          If your day includes a temple sealing, you will usually wear your suit for arrival, exterior
          photographs and the reception or ring ceremony. Choose a classic cut and a timeless colour that
          will photograph beautifully for decades.
        </p>
        <h3>Black-tie evenings</h3>
        <p>
          A dinner suit in midnight navy or black barathea, with a satin or grosgrain-faced peak or shawl
          lapel, is correct for formal evening receptions. Midnight navy often reads richer than black
          under artificial light.
        </p>
      </Block>

      <Block id="party" eyebrow="The wedding party" title="Groomsmen, fathers and ring bearers">
        <p>
          We coordinate cloth, cut and accessories across the whole party so it looks considered, not
          uniform. The groom is set apart by a distinct cloth, a waistcoat or a different lapel.
          Groomsmen&rsquo;s options: <Ph>confirm whether groomsmen are offered bespoke, made-to-measure, or both</Ph>.
          Out-of-town party members: {rich(studio.remoteMeasuring)}. Group pricing:{" "}
          {rich(studio.weddingPartyPricing)}.
        </p>
      </Block>
    </ServicePage>
  );
}
