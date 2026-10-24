import type { Metadata } from "next";
import { studio } from "@/content/business";
import Link from "next/link";
import { Block, ServicePage } from "@/components/layout/ServicePage";
import { ComparisonTable } from "@/components/ui/ComparisonTable";
import { rich } from "@/components/ui/Rich";
import { faqsByTag } from "@/content/faq";
import { services } from "@/content/services";
import { pageMeta } from "@/lib/seo/metadata";

const s = services.bespoke;

export const metadata: Metadata = pageMeta({
  title: s.title,
  description: s.description,
  path: s.path,
  keywords: ["bespoke suits Salt Lake City", "custom suits Salt Lake City", "bespoke tailor Utah"],
});

export default function BespokeSuitsPage() {
  return (
    <ServicePage
      service={s}
      eyebrow="Bespoke Suits · Salt Lake City"
      h1={
        <>
          Bespoke suits, <em className="text-gold">cut from your own pattern</em>.
        </>
      }
      facts={[
        ["Starting price", s.priceFrom],
        ["Typical timeline", `${studio.bespokeWeeks} weeks`],
        ["First consultation", "Free, 30 minutes"],
        ["Your pattern", "Drafted for you, kept on file"],
      ]}
      faqs={faqsByTag("bespoke")}
      related={[
        { href: "/fabrics", label: "Fabrics", description: "Cloth weights and mills for Utah's climate." },
        { href: "/process", label: "The Process", description: "Five steps from consultation to final fitting." },
        {
          href: "/journal/bespoke-vs-made-to-measure-vs-off-the-rack",
          label: "Bespoke vs MTM",
          description: "What you're actually paying for.",
        },
      ]}
    >
      <Block id="what-is-bespoke" eyebrow="Definition" title="What makes a suit bespoke">
        <p>
          A bespoke suit starts with a blank sheet of pattern paper. Your clothier takes more than twenty
          measurements, notes how you stand (shoulder slope, the set of your neck, the carriage of your
          arms) and drafts a pattern that belongs to you alone. The suit is then cut, basted together and
          fitted on your body, taken apart, recut where needed and fitted again.
        </p>
        <p>
          That is the difference from <strong>made-to-measure</strong>, which alters a factory&rsquo;s
          existing block pattern, and from <strong>off-the-rack</strong>, which is cut to a standard size
          and altered after purchase. Neither can fully correct a dropped shoulder, a forward neck or an
          athletic drop between chest and waist. Bespoke can.
        </p>
        <ComparisonTable caption="Bespoke vs made-to-measure vs off-the-rack (typical US market figures)" />
        <p>
          For a deeper comparison, read{" "}
          <Link href="/journal/bespoke-vs-made-to-measure-vs-off-the-rack">
            Bespoke vs Made-to-Measure vs Off-the-Rack: What You&rsquo;re Actually Paying For
          </Link>
          .
        </p>
      </Block>

      <Block id="included" eyebrow="What's included" title="Every commission includes">
        <ul>
          <li>A private consultation on style, occasion and how often the suit will be worn.</li>
          <li>Full measurements and posture notes, drafted into your individual paper pattern.</li>
          <li>
            Cloth selection from {rich(studio.mills)}, with guidance on weight for
            Utah&rsquo;s seasons.
          </li>
          <li>Choice of lapel, button stance, pockets, lining, buttons and trouser details.</li>
          <li>Fittings to refine the balance and details, each about 30–45 minutes.</li>
          <li>Final pressing, and your pattern archived for future commissions.</li>
          <li>Aftercare: if anything needs adjusting after delivery, we handle it.</li>
        </ul>
      </Block>

      <Block id="construction" eyebrow="Construction" title="Built in canvas, finished by hand">
        <p>
          The structure of a jacket lives in its canvas, a layer of wool and horsehair between the cloth
          and the lining. In a <strong>full-canvas</strong> jacket it runs the length of the front and
          floats free, so the chest moulds to you over months of wear and the lapel rolls rather than
          lies flat. A <strong>half-canvas</strong> jacket carries canvas through the chest and lapel
          only. A <strong>fused</strong> jacket is glued throughout.
        </p>
        <p>
          Summit Customs construction: {studio.canvas}.
        </p>
        <h3>Why the shoulder matters most</h3>
        <p>
          A tailor can shorten a sleeve or take in a waist. A shoulder that&rsquo;s wrong stays wrong. It
          is the first thing a bespoke pattern gets right, and the reason a bespoke jacket looks calm on
          the body when you reach, sit or turn.
        </p>
      </Block>

      <Block id="who" eyebrow="Who it's for" title="For people who are judged in the first few seconds">
        <p>
          Bespoke is built for attorneys, physicians, founders, investors and executives across Salt Lake City,
          Park City, Provo, Ogden, Sandy and Draper: people who don&rsquo;t want more clothes. They want fewer,
          better ones that fit on the first try every morning. Many are hard to fit off the rack: athletic
          builds, long or short torsos, broad shoulders, or one shoulder lower than the other.
        </p>
      </Block>

      <Block id="pricing" eyebrow="Investment" title="What a bespoke suit costs">
        <p>
          Every Summit Customs suit is quoted individually at your consultation. The final figure
          depends on three things:
        </p>
        <ol>
          <li><strong>Cloth:</strong> the mill, the fibre and the weight. A Super 110s worsted and a Super 180s wool–silk differ greatly in cost.</li>
          <li><strong>Construction:</strong> full canvas and hand finishing take more hours than half canvas.</li>
          <li><strong>Design:</strong> extras such as a waistcoat, a second pair of trousers or contrast details.</li>
        </ol>
        <p>Your quote is confirmed in writing at the fabric consultation, before anything is cut.</p>
      </Block>
    </ServicePage>
  );
}
