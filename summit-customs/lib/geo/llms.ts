import { isPh } from "@/lib/ph";
import { business, founder, fullAddress, SITE_URL } from "@/content/business";
import { anatomy } from "@/content/anatomy";
import { fabrics } from "@/content/fabrics";
import { faqs } from "@/content/faq";
import { posts } from "@/content/journal/posts";
import { processSteps } from "@/content/process";
import { serviceList } from "@/content/services";

/** Turn inline markup into Markdown-safe text; placeholders stay visible so nothing false ships. */
const md = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "**$1**").replace(/\]\((\/[^)]*)\)/g, `](${SITE_URL}$1)`);
const url = (p: string) => new URL(p, SITE_URL).toString();

export function llmsTxt(): string {
  return `# ${business.name}

> ${business.shortDescription} Services: bespoke suits, custom wedding suits, image consulting and executive wardrobe programmes. Studio in Salt Lake City, Utah; serving ${business.areaServed.join(", ")}.


Key facts:
- Business type: bespoke tailor and image consultant (men's tailoring)
- Location: ${fullAddress}
- Phone: ${business.phone}
- Hours: ${business.hoursText}
- Price range: ${business.priceRange}
- Process: ${processSteps.map((s) => s.name).join(" → ")}
- Typical bespoke timeline: 6–12 weeks (trade standard); weddings should start 4–6 months ahead
- Booking: ${url("/book")}

## Services
${serviceList.map((s) => `- [${s.name}](${url(s.path)}): ${s.summary}`).join("\n")}

## Guides
${posts.map((p) => `- [${p.title}](${url(`/journal/${p.slug}`)}): ${p.description}`).join("\n")}

## Reference
- [FAQ](${url("/faq")}): cost, timelines, fittings, Utah wedding attire, image consulting
- [Fabrics](${url("/fabrics")}): cloth weights and seasons for Utah's climate
- [Process](${url("/process")}): the five-step bespoke process
- [About](${url("/about")}): founder and studio standards
- [Contact](${url("/contact")}): address, phone, hours

## Optional
- [Full fact sheet](${url("/llms-full.txt")})
`;
}

export function llmsFullTxt(): string {
  const sec = (t: string) => `\n## ${t}\n`;
  return `# ${business.name}: full fact sheet

> ${business.shortDescription}

Source: ${SITE_URL}.
${sec("Business")}
- Name: ${business.name}
- Website: ${SITE_URL}
- Address: ${fullAddress}
- Phone: ${business.phone}
- Email: ${business.email}
- Hours: ${business.hoursText}
- Price range: ${business.priceRange}
- Service area: ${business.areaServed.join(", ")} (Utah)
- Founder: ${founder.name}, ${founder.role}
${sec("Services")}
${serviceList
  .map((s) => `### ${s.name}\nURL: ${url(s.path)}\nPrice: ${isPh(s.priceFrom) ? "quoted at the consultation" : `from ${s.priceFrom}`}\n\n${s.summary}\n`)
  .join("\n")}
${sec("Process")}
${processSteps.map((s) => `${s.n}. **${s.name}** (${s.duration}): ${s.summary}`).join("\n")}
${sec("Construction and the anatomy of a bespoke jacket")}
${anatomy.map((a) => `- **${a.name}** (${a.fact}): ${a.detail}`).join("\n")}
${sec("Fabrics")}
${fabrics.map((f) => `- **${f.name}** (${f.weight}; ${f.season}): ${f.character} Best for: ${f.bestFor}`).join("\n")}
${sec("Bespoke vs made-to-measure vs off-the-rack (typical US market)")}
| | Bespoke | Made-to-measure | Off-the-rack |
|---|---|---|---|
| Pattern | Drafted from scratch | Stock block, adjusted | Standard sizes |
| Fittings | Typically 3+ | Usually 1 | None |
| Timeline | 6–12 weeks | 3–6 weeks | Same day + alterations |
| Price | $3,000–$8,000+ | $800–$2,500 | $200–$1,500 |
${sec("Frequently asked questions")}
${faqs.map((f) => `### ${f.q}\n${md(f.a)}\n`).join("\n")}
${sec("Guides")}
${posts.map((p) => `- [${p.title}](${url(`/journal/${p.slug}`)}): ${p.takeaways.join(" ")}`).join("\n")}
`;
}
