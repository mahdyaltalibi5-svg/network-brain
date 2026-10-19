import { ph } from "@/lib/ph";
import { studio } from "@/content/business";

export type Service = {
  slug: string;
  path: string;
  name: string;
  serviceType: string;
  primaryKeyword: string;
  title: string;
  description: string;
  /** Answer-first summary: 2–3 sentences, opens every service page. */
  summary: string;
  priceFrom: string;
};

export const services = {
  bespoke: {
    slug: "bespoke-suits",
    path: "/bespoke-suits",
    name: "Bespoke Suits",
    serviceType: "Bespoke tailoring",
    primaryKeyword: "bespoke suits Salt Lake City",
    title: "Bespoke Suits in Salt Lake City | Summit Customs",
    description:
      "Bespoke suits cut from your own pattern in Salt Lake City. Individual patterns, multiple fittings and cloth from the world's great mills. Book a private fitting.",
    summary:
      "Summit Customs is a Salt Lake City bespoke tailor that drafts an individual pattern for every client and refines each suit over multiple fittings. Cloth comes from the world's leading mills and is chosen for how you'll actually wear it: dry Utah summers, snowy winters and long travel days. A bespoke commission typically takes 6–12 weeks from first consultation to final fitting.",
    priceFrom: studio.bespokeFrom,
  },
  wedding: {
    slug: "custom-wedding-suits-salt-lake-city",
    path: "/custom-wedding-suits-salt-lake-city",
    name: "Custom Wedding Suits",
    serviceType: "Custom wedding suits and groomswear",
    primaryKeyword: "custom wedding suits Utah",
    title: "Custom Wedding Suits in Salt Lake City & Utah | Summit Customs",
    description:
      "Custom wedding suits and tuxedos for grooms and wedding parties in Salt Lake City, Park City and across Utah. Start 4–6 months out. Book a private fitting.",
    summary:
      "Summit Customs makes custom wedding suits and dinner suits for grooms, groomsmen and fathers across Salt Lake City, Park City and the Wasatch Front. We plan the cloth around your venue and season, then fit each garment so it photographs cleanly and moves well through a long day. Start 4 to 6 months before the wedding.",
    priceFrom: ph("groom's custom suit starting price"),
  },
  image: {
    slug: "image-consulting",
    path: "/image-consulting",
    name: "Image Consulting",
    serviceType: "Personal image consulting",
    primaryKeyword: "image consultant Salt Lake City",
    title: "Image Consultant in Salt Lake City | Summit Customs",
    description:
      "Image consulting in Salt Lake City for executives and professionals: colour analysis, wardrobe audit, style strategy and presence coaching, with tailoring under one roof.",
    summary:
      "Summit Customs offers image consulting in Salt Lake City for professionals whose appearance is part of the job. The work covers colour and proportion analysis, a full wardrobe audit, a purchasing plan and presence for the rooms you actually work in. Because consulting and bespoke tailoring sit under one roof, the plan is built, not just bought.",
    priceFrom: ph("image consulting package starting price"),
  },
  executive: {
    slug: "executive-wardrobe",
    path: "/executive-wardrobe",
    name: "Executive Wardrobe",
    serviceType: "Executive wardrobe consulting and tailoring",
    primaryKeyword: "executive wardrobe consultant",
    title: "Executive Wardrobe Consultant, Salt Lake City | Summit Customs",
    description:
      "An executive wardrobe consultant in Salt Lake City who plans, tailors and maintains a complete capsule wardrobe for leaders who travel, present and lead.",
    summary:
      "Summit Customs builds and maintains complete wardrobes for executives in Salt Lake City and across Utah. We audit what you own, design a capsule around your calendar, tailor the core pieces to your pattern and refresh the rotation each season. The result is fewer decisions every morning and a consistent presence in every room.",
    priceFrom: ph("executive wardrobe programme starting price or retainer"),
  },
} satisfies Record<string, Service>;

export const serviceList: Service[] = Object.values(services);
