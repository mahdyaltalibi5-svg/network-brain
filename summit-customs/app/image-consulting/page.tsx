import type { Metadata } from "next";
import { Block, ServicePage } from "@/components/layout/ServicePage";
import { Ph } from "@/components/ui/Rich";
import { faqsByTag } from "@/content/faq";
import { services } from "@/content/services";
import { pageMeta } from "@/lib/seo/metadata";

const s = services.image;

export const metadata: Metadata = pageMeta({
  title: s.title,
  description: s.description,
  path: s.path,
  keywords: ["image consultant Salt Lake City", "personal stylist Salt Lake City", "colour analysis Utah"],
});

const modules: [string, string][] = [
  ["Colour analysis", "Which shades bring your complexion forward on camera and across a table, and which flatten it. Every later choice is built on this palette."],
  ["Proportion & silhouette", "How your frame reads: shoulder line, torso length, leg line. The cuts, lengths and patterns that balance it."],
  ["Wardrobe audit", "An edit of what you own: keep, tailor or retire. Most clients leave with fewer pieces that work much harder."],
  ["Purchasing plan", "A prioritised list of what to commission and what to buy, with a budget and a sequence."],
  ["Presence", "Dress codes decoded for your world: boardroom, courtroom, keynote stage, investor meeting, video call."],
  ["Grooming", "Haircut, eyewear, watch and the small details that finish the picture."],
];

export default function ImageConsultingPage() {
  return (
    <ServicePage
      service={s}
      eyebrow="Image Consulting · Salt Lake City"
      h1={
        <>
          Image consulting for people <em className="text-gold">whose presence is part of the job</em>.
        </>
      }
      facts={[
        ["Format", "Private, one-to-one"],
        ["Covers", "Colour, proportion, wardrobe, presence"],
        ["Location", "Salt Lake City studio + your wardrobe"],
        ["Packages from", s.priceFrom],
      ]}
      faqs={faqsByTag("image")}
      related={[
        { href: "/executive-wardrobe", label: "Executive Wardrobe", description: "Turn the plan into a complete, maintained wardrobe." },
        { href: "/bespoke-suits", label: "Bespoke Suits", description: "Recommendations built to your pattern." },
        { href: "/journal/executive-capsule-wardrobe", label: "Capsule Wardrobe", description: "Building an executive capsule, step by step." },
      ]}
    >
      <Block id="what" eyebrow="What an image consultant does" title="Deliberate, not decorative">
        <p>
          An image consultant helps you look the part on purpose. People form first impressions within
          seconds, long before you have said anything of substance. Consulting makes those seconds work
          for you: the right colours near your face, the right proportions for your frame, and the right
          level of formality for every room on your calendar.
        </p>
        <p>
          Most image consultants can only recommend. At Summit Customs, consulting and bespoke tailoring
          sit under one roof, so what we recommend can be made to your pattern instead of hunted for in
          stores.
        </p>
      </Block>

      <Block id="modules" eyebrow="The work" title="What the programme covers">
        <dl className="grid gap-x-10 gap-y-8 !space-y-0 sm:grid-cols-2">
          {modules.map(([k, v]) => (
            <div key={k} className="!mt-0">
              <dt className="font-display text-2xl text-ivory">{k}</dt>
              <dd className="mt-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block id="who" eyebrow="Who it's for" title="For leaders in transition, and the people who advise them">
        <ul>
          <li>Executives stepping into a larger role, a board seat or a public-facing position.</li>
          <li>Founders preparing for fundraising, a keynote or an exit.</li>
          <li>Attorneys and physicians who want authority without stiffness.</li>
          <li>Professionals relocating to Utah who need to read local dress codes, which are often less formal than on the coasts.</li>
        </ul>
      </Block>

      <Block id="packages" eyebrow="Packages" title="Ways to work together">
        <p>
          Package structure and pricing: <Ph>image consulting packages, e.g. single colour session / full programme / ongoing retainer, with prices and session lengths</Ph>.
        </p>
      </Block>
    </ServicePage>
  );
}
