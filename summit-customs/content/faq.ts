import { studio, business } from "@/content/business";

export type FaqTag = "cost" | "bespoke" | "wedding" | "image" | "executive" | "fabric" | "process" | "studio";

export type Faq = {
  id: string;
  q: string;
  /** Answer copy; supports [link](/href), **bold** and placeholders. First sentence must answer directly. */
  a: string;
  tags: FaqTag[];
  home?: boolean;
};

export const faqs: Faq[] = [
  {
    id: "cost",
    q: "How much does a custom suit cost in Salt Lake City?",
    a: `At Summit Customs, every suit is quoted individually at your consultation. Across most US cities, made-to-measure suits generally fall around $800–$2,500 and fully bespoke suits around $3,000–$8,000 or more. The price is driven by three things: the cloth (mill, weight and fibre), the construction (fused, half canvas or full canvas) and the hours of hand work. Your quote is fixed at the fabric consultation, before anything is cut. See [Bespoke Suits](/bespoke-suits) for what is included.`,
    tags: ["cost", "bespoke"],
    home: true,
  },
  {
    id: "bespoke-vs-mtm",
    q: "What is the difference between bespoke and made-to-measure?",
    a: "A bespoke suit is cut from a paper pattern drafted from scratch for one person, then refined over several fittings. A made-to-measure suit adjusts a factory's existing block pattern to your measurements, usually with a single fitting at the end. Bespoke corrects posture, shoulder slope and asymmetry that a block pattern cannot. Made-to-measure is faster and costs less. Off-the-rack is mass-produced in standard sizes and then altered. Read the full comparison in our [journal](/journal/bespoke-vs-made-to-measure-vs-off-the-rack).",
    tags: ["bespoke", "cost"],
    home: true,
  },
  {
    id: "timeline",
    q: "How long does a bespoke suit take?",
    a: `Plan on ${studio.bespokeWeeks} weeks from first consultation to final fitting. Across the trade, a true bespoke suit typically takes 6 to 12 weeks, because the garment is built in stages and checked on your body between them. Rush timelines may be possible: ${studio.rush}. For weddings, we recommend starting 4 to 6 months ahead.`,
    tags: ["bespoke", "process", "wedding"],
    home: true,
  },
  {
    id: "fittings",
    q: "How many fittings does a custom suit need?",
    a: `Fittings at Summit Customs refine the balance and details before delivery. The trade standard is a **baste fitting** (the jacket loosely tacked together so the shape can be changed), a **forward fitting** (sleeves and collar set, balance confirmed) and a **final fitting**. Each appointment takes about 30–45 minutes.`,
    tags: ["bespoke", "process"],
  },
  {
    id: "canvas",
    q: "What is a full-canvas suit, and is it worth it?",
    a: "A full-canvas jacket has a layer of wool and horsehair canvas running the full length of the front, stitched to the cloth rather than glued. Over time it moulds to your chest and lets the lapel roll naturally. A half-canvas jacket uses canvas in the chest and lapel only, with a fused (glued) lower front. A fully fused jacket uses adhesive throughout and can blister after dry cleaning. For a suit you will wear for years, full canvas is worth it. Half canvas is a sound choice for warm-weather or lower-cost garments.",
    tags: ["bespoke"],
  },
  {
    id: "wedding-when",
    q: "When should I order a custom wedding suit in Utah?",
    a: "Start 4 to 6 months before the wedding. That leaves time to choose cloth, complete every fitting and make a final adjustment in the last 2–3 weeks. For a full wedding party, start 6 months out so every groomsman can be measured. Utah's peak wedding months are May through October, so studio calendars fill early. See [Custom Wedding Suits](/custom-wedding-suits-salt-lake-city).",
    tags: ["wedding", "process"],
    home: true,
  },
  {
    id: "utah-wedding-wear",
    q: "What should a groom wear to a Utah wedding?",
    a: "Match the venue and the season. For an outdoor mountain ceremony in Park City or the Cottonwood canyons, choose a mid-weight wool (260–300 g) in navy, mid-grey or a soft earth tone, because evenings can drop 20°F or more after sunset. For a summer valley reception, a high-twist wool or wool–linen blend in a lighter shade stays cool. For a black-tie evening, a midnight-navy or black dinner suit is correct. If your day includes a temple sealing, you will usually wear your suit for arrival, exterior photographs and the reception or ring ceremony, so prioritise a classic cut that photographs well.",
    tags: ["wedding", "fabric"],
    home: true,
  },
  {
    id: "wedding-guest",
    q: "What should a man wear to a Utah wedding as a guest?",
    a: "Unless the invitation says otherwise, a well-fitted suit in navy or grey with a tie is always correct. For outdoor summer weddings, a lightweight odd jacket with trousers works. Avoid wearing white or anything that competes with the wedding party, and bring a layer for mountain evenings.",
    tags: ["wedding"],
  },
  {
    id: "wedding-party",
    q: "Can you dress an entire wedding party?",
    a: `Yes. We coordinate cloth, cut and accessories across the groom, groomsmen and fathers, so the party looks considered without looking uniform. We dress grooms, groomsmen, fathers and family; have everyone measured at least three months before the date so all the pieces are made together. Group pricing is quoted at your consultation.`,
    tags: ["wedding"],
  },
  {
    id: "image-consultant",
    q: "What does an image consultant do?",
    a: "An image consultant helps you look the part deliberately. The work typically covers colour analysis (which shades flatter your skin, hair and eyes), proportion and style analysis, a wardrobe audit, a shopping or commissioning plan, and grooming and presence for the settings you actually work in: boardrooms, stages, interviews and camera. At Summit Customs, consulting and tailoring happen under one roof, so recommendations can be built rather than just bought. See [Image Consulting](/image-consulting).",
    tags: ["image"],
    home: true,
  },
  {
    id: "image-worth",
    q: "Is image consulting worth it for executives?",
    a: "For people who are judged quickly and often, yes. Investors, juries, clients and boards form impressions within seconds. A consultant shortens the trial-and-error, removes the wardrobe that works against you and builds a smaller set of clothes that do more. Most executives come out of the process owning fewer, better pieces and spending less time getting dressed.",
    tags: ["image", "executive"],
  },
  {
    id: "executive-consultant",
    q: "What does an executive wardrobe consultant do?",
    a: "An executive wardrobe consultant plans, sources and maintains a complete working wardrobe for a senior professional. The work starts with an audit of what you own and how your calendar runs. It then becomes a capsule plan, the tailoring of core pieces, and seasonal reviews so the rotation never looks tired. The goal is fewer decisions each morning and a consistent presence in every room. See [Executive Wardrobe](/executive-wardrobe).",
    tags: ["executive"],
  },
  {
    id: "how-many-suits",
    q: "How many suits does an executive need?",
    a: "Four is the practical minimum for someone who wears a suit most days: two navy and two grey, in a year-round weight. That lets each suit rest at least a day between wears, which roughly doubles its life. Add an odd jacket and a winter flannel, and the rotation covers almost any calendar. Read [Building an Executive Capsule Wardrobe](/journal/executive-capsule-wardrobe).",
    tags: ["executive"],
  },
  {
    id: "climate",
    q: "What suit fabrics work best for Utah's climate?",
    a: "Salt Lake City sits at about 4,200 feet, with hot, dry summers and cold, snowy winters, so most clients need two weights. For May to September, choose high-twist worsteds, fresco or wool–linen at 230–270 g; they breathe and resist creasing. For October to April, choose flannel or heavier worsteds at 300–370 g. A 270–300 g worsted is the most useful year-round weight for offices. See [Fabrics](/fabrics).",
    tags: ["fabric"],
  },
  {
    id: "service-area",
    q: "Do you serve Park City, Provo, Ogden, Sandy and Draper?",
    a: `Yes. Our studio is in Salt Lake City, and we work with clients across the Wasatch Front and Back, including Park City, Provo, Ogden, Sandy and Draper. Consultations are also available by video.`,
    tags: ["studio"],
  },
  {
    id: "first-fitting",
    q: "What should I bring to my first consultation?",
    a: "Wear or bring the shoes you plan to wear with the suit, plus a shirt you like the fit of. If you have photos of looks you admire, or a suit that has always felt right, bring those too. Expect about 60–90 minutes for the consultation and measurements.",
    tags: ["process"],
  },
  {
    id: "weight-change",
    q: "What if my body changes after my suit is made?",
    a: `Bespoke suits are built with generous inlays (extra cloth in the seams) so they can be let out or taken in later. Your pattern is kept on file, so future commissions start from a proven fit. If anything needs adjusting after delivery, we handle it.`,
    tags: ["bespoke", "process"],
  },
  {
    id: "book",
    q: "How do I book a fitting?",
    a: `Book a private fitting [online](/book), or call ${business.phone}. Consultations are private and unhurried, and nothing is cut until you have approved the cloth, the design and the price.`,
    tags: ["studio", "process"],
    home: true,
  },
];

export const homeFaqs = faqs.filter((f) => f.home);
export const faqsByTag = (tag: FaqTag) => faqs.filter((f) => f.tags.includes(tag));
