export type PostMeta = {
  slug: string;
  title: string;
  /** <title> tag (≤ 60–65 chars where possible). */
  seoTitle: string;
  description: string;
  section: string;
  published: string;
  modified: string;
  readingMinutes: number;
  /** Key takeaways shown at the top of the article. These are the quotable facts. */
  takeaways: string[];
  toc: { id: string; label: string }[];
};

export const posts: PostMeta[] = [
  {
    slug: "bespoke-vs-made-to-measure-vs-off-the-rack",
    title: "Bespoke vs Made-to-Measure vs Off-the-Rack: What You're Actually Paying For",
    seoTitle: "Bespoke vs Made-to-Measure vs Off-the-Rack Suits Explained",
    description:
      "The real differences between bespoke, made-to-measure and off-the-rack suits: pattern, construction, fittings, timeline and price, and how to choose.",
    section: "Tailoring",
    published: "2026-10-19",
    modified: "2026-10-19",
    readingMinutes: 9,
    takeaways: [
      "Bespoke = a pattern drafted from scratch for you, refined over typically 3+ fittings, 6–12 weeks.",
      "Made-to-measure = a factory block pattern adjusted to your measurements, usually 3–6 weeks and 1 fitting.",
      "Off-the-rack = standard sizes, altered afterwards. The shoulder can't be fixed.",
      "Most of the price difference is hidden: canvas construction and hours of hand work.",
    ],
    toc: [
      { id: "pattern", label: "The pattern is the product" },
      { id: "off-the-rack", label: "Off-the-rack" },
      { id: "made-to-measure", label: "Made-to-measure" },
      { id: "bespoke", label: "Bespoke" },
      { id: "construction", label: "Inside the jacket" },
      { id: "comparison", label: "Side by side" },
      { id: "value", label: "Price versus cost per wear" },
      { id: "red-flags", label: "When “bespoke” isn't bespoke" },
      { id: "choosing", label: "How to choose" },
    ],
  },
  {
    slug: "custom-wedding-suit-timeline",
    title: "Custom Wedding Suit Timeline: When to Start and What to Expect",
    seoTitle: "Custom Wedding Suit Timeline: When to Start (Utah Guide)",
    description:
      "When to order a custom wedding suit, month by month: consultation, cloth, fittings and the final fitting, plus planning for Utah venues and wedding parties.",
    section: "Weddings",
    published: "2026-10-19",
    modified: "2026-10-19",
    readingMinutes: 8,
    takeaways: [
      "Start 4–6 months before the wedding; 6 months if you're dressing the whole party.",
      "Schedule the final fitting 2–3 weeks before the day, not earlier.",
      "Utah's peak wedding season (May–October) fills tailoring calendars early.",
      "Choose cloth for the venue: mid-weight for mountain evenings, high-twist for valley summers.",
    ],
    toc: [
      { id: "short-answer", label: "The short answer" },
      { id: "month-by-month", label: "Month by month" },
      { id: "party", label: "Dressing the party" },
      { id: "utah", label: "Utah venues and seasons" },
      { id: "styles", label: "Choosing the style" },
      { id: "budget", label: "Budgeting" },
      { id: "checklist", label: "Accessories checklist" },
      { id: "after", label: "After the wedding" },
      { id: "mistakes", label: "Common mistakes" },
      { id: "questions", label: "Questions to ask your tailor" },
      { id: "rush", label: "If you're short on time" },
    ],
  },
  {
    slug: "executive-capsule-wardrobe",
    title: "Building an Executive Capsule Wardrobe",
    seoTitle: "How to Build an Executive Capsule Wardrobe",
    description:
      "How to build a capsule wardrobe for executives: the core pieces, colours, cloth weights, rotation and the order to commission them, with a Utah lens.",
    section: "Wardrobe",
    published: "2026-10-19",
    modified: "2026-10-19",
    readingMinutes: 8,
    takeaways: [
      "A working executive capsule is 15–20 core pieces built around navy and grey.",
      "Four suits is the practical minimum for daily wear, so each one rests between wears.",
      "Commission in order: navy suit, grey suit, odd jacket, then the second navy and grey.",
      "In Utah, plan two cloth weights: high-twist for summer, flannel for winter.",
    ],
    toc: [
      { id: "why", label: "Why a capsule" },
      { id: "core", label: "The core pieces" },
      { id: "palette", label: "Palette" },
      { id: "cloth", label: "Cloth and climate" },
      { id: "shirts", label: "Shirts, ties and details" },
      { id: "utah-dress", label: "Dress codes in Utah business" },
      { id: "travel", label: "Travelling with the capsule" },
      { id: "outerwear", label: "Outerwear and knitwear" },
      { id: "retire", label: "What to retire" },
      { id: "order", label: "The order to build it" },
      { id: "maintain", label: "Keeping it sharp" },
    ],
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
