import type { Metadata } from "next";
import Link from "next/link";
import { Block, ServicePage } from "@/components/layout/ServicePage";
import { Ph } from "@/components/ui/Rich";
import { faqsByTag } from "@/content/faq";
import { services } from "@/content/services";
import { pageMeta } from "@/lib/seo/metadata";

const s = services.executive;

export const metadata: Metadata = pageMeta({
  title: s.title,
  description: s.description,
  path: s.path,
  keywords: ["executive wardrobe consultant", "executive stylist Salt Lake City", "capsule wardrobe for executives"],
});

const capsule: [string, string][] = [
  ["2 navy suits", "Plain and a subtle texture or stripe. The backbone of the rotation."],
  ["2 grey suits", "One mid-grey worsted, one charcoal flannel for winter."],
  ["1 odd jacket", "A navy or textured blazer that pairs with every trouser."],
  ["3 pairs of trousers", "Grey, tan and a winter flannel, all cut to your pattern."],
  ["8–10 shirts", "White and pale blue, two collar shapes for tie and open-neck wear."],
  ["1 overcoat", "A mid-length coat for Salt Lake City winters, worn over a suit."],
];

export default function ExecutiveWardrobePage() {
  return (
    <ServicePage
      service={s}
      eyebrow="Executive Wardrobe · Salt Lake City"
      h1={
        <>
          An executive wardrobe, <em className="text-gold">planned, built and maintained</em>.
        </>
      }
      facts={[
        ["Starts with", "A wardrobe audit"],
        ["Typical capsule", "15–20 core pieces"],
        ["Refresh", "Each season"],
        ["Programme from", s.priceFrom],
      ]}
      faqs={faqsByTag("executive")}
      related={[
        { href: "/journal/executive-capsule-wardrobe", label: "Capsule Wardrobe", description: "How an executive capsule is built." },
        { href: "/image-consulting", label: "Image Consulting", description: "The strategy behind the wardrobe." },
        { href: "/fabrics", label: "Fabrics", description: "Cloth that travels and survives a full calendar." },
      ]}
    >
      <Block id="why" eyebrow="The brief" title="Fewer decisions, a stronger signal">
        <p>
          The most effective executives dress with very little thought because the thinking has already
          been done. An executive wardrobe programme does that thinking once. We decide what you need,
          build it to fit, and keep it in rotation. Then getting dressed takes two minutes, and every
          outfit works with every other one.
        </p>
      </Block>

      <Block id="capsule" eyebrow="The capsule" title="A typical starting capsule">
        <p>Every wardrobe is planned around the person, but a strong starting point for most executives looks like this:</p>
        <table>
          <caption className="sr-only">Typical executive capsule wardrobe</caption>
          <tbody>
            {capsule.map(([item, why]) => (
              <tr key={item}>
                <th scope="row">{item}</th>
                <td>{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          The reasoning is in our journal:{" "}
          <Link href="/journal/executive-capsule-wardrobe">Building an Executive Capsule Wardrobe</Link>.
        </p>
      </Block>

      <Block id="programme" eyebrow="How it works" title="The programme">
        <ol>
          <li><strong>Audit:</strong> we review your current wardrobe, your calendar and your travel.</li>
          <li><strong>Plan:</strong> a capsule specification, with what to commission, what to keep and what to retire.</li>
          <li><strong>Build:</strong> core pieces are tailored to your pattern in a sequence that fits your budget.</li>
          <li><strong>Maintain:</strong> seasonal reviews, repairs and replacements before anything looks tired.</li>
        </ol>
        <p>
          Programme format and retainer: <Ph>executive programme structure, e.g. annual retainer, number of seasonal reviews, in-office visits</Ph>.
        </p>
      </Block>
    </ServicePage>
  );
}
