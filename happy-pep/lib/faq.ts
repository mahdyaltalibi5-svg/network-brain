import { site } from "./site";

export type FaqItem = { q: string; a: string };
export type FaqGroup = { title: string; items: FaqItem[] };

// Keep answers factual: no health, dosing or results claims.
export const FAQ: FaqGroup[] = [
  {
    title: "General",
    items: [
      { q: "What are research peptides?", a: "Short synthetic chains of amino acids, supplied as a lyophilized (freeze-dried) powder in sealed vials for in-vitro laboratory research." },
      { q: "Who are your products for?", a: "Researchers aged 21 and over, for laboratory research use only. Products are not for human or veterinary use." },
      { q: "Are these products approved for clinical or consumer use?", a: "No. They are not drugs, foods, supplements or cosmetics, and they are not evaluated or approved by the FDA for any use in people or animals." },
      { q: "Can I return products?", a: "Unopened, sealed vials can be returned within 14 days of delivery. Damaged or incorrect items are replaced or refunded. See the Refund Policy for details." },
    ],
  },
  {
    title: "Storage & handling",
    items: [
      { q: "Do vials need to be refrigerated when they arrive?", a: "Lyophilized powder ships at room temperature. On arrival, store vials refrigerated (2–8°C) and away from light; for long-term storage, many labs keep them frozen." },
      { q: "What is BAC water?", a: "Bacteriostatic water: sterile water with 0.9% benzyl alcohol, a standard laboratory diluent. A vial is included free with every order." },
    ],
  },
  {
    title: "Product quality",
    items: [
      { q: "How do you verify quality?", a: "Every batch is sent to an independent third-party lab for HPLC (purity) and mass spectrometry (identity) before it's sold." },
      { q: "What purity do your peptides meet?", a: "Our standard is ≥99% purity by HPLC. The exact result for each batch is on its Certificate of Analysis." },
      { q: "Where can I find Certificates of Analysis?", a: "On every product page, and in the COA library. Match the batch number on your vial to its certificate." },
    ],
  },
  {
    title: "Shipping",
    items: [
      {
        q: "How long does shipping take?",
        a: `Order before ${site.cutoffHour}:00 PM Mountain Time, Monday to Friday: same-day delivery in ${site.sameDayZones.join(", ")}, and same-day shipping everywhere else. Outside Utah, orders arrive within ${site.guaranteeDays} business days of shipping or we refund your shipping.`,
      },
      { q: "How much is shipping?", a: `Free on orders of $${site.freeShippingMin} or more, and a flat $${site.shippingRate} below that.` },
      { q: "Do you ship internationally?", a: "Not yet. We ship within the contiguous United States only (no AK, HI, U.S. territories or PO boxes)." },
      { q: "Can I track my order?", a: "Yes. You'll get a tracking link by email as soon as your order ships." },
    ],
  },
  {
    title: "Compliance",
    items: [
      { q: "Are your products FDA approved?", a: "No. All products are sold strictly for laboratory research use and have not been evaluated by the FDA." },
      { q: "Do I need to be 21 to order?", a: "Yes. You must be 21 or older and confirm research-only use to enter the site and to check out." },
    ],
  },
  {
    title: "Contact",
    items: [{ q: "How do I reach you?", a: `Email ${site.email}. Real people answer, usually within one business day.` }],
  },
];

export const TOP_FAQ: FaqItem[] = [FAQ[3].items[0], FAQ[3].items[1], FAQ[2].items[0], FAQ[1].items[1], FAQ[0].items[1]];
