// Edit these before launch.
export const site = {
  name: "Happy Pep",
  email: "hello@happypep.com",
  // Where same-day delivery is available. Shown on the shipping policy.
  sameDayZones: ["Salt Lake County", "Utah County", "Davis County"],
  // First 3 digits of ZIP codes that get same-day delivery (approximate:
  // 840 = Salt Lake/Davis/north Utah County, 841 = Salt Lake City, 846 = Provo/Orem).
  sameDayZipPrefixes: ["840", "841", "846"],
  // Order cutoff for same-day Utah delivery and same-day shipping, Mountain Time (24h).
  cutoffHour: 12,
  // Nationwide delivery guarantee, in business days after shipping.
  guaranteeDays: 5,
  timeZone: "America/Denver",
  // Orders at or above this (after discounts) ship free.
  freeShippingMin: 99,
  // "Stack & save": discount by number of vials in the cart.
  stackTiers: [
    { min: 2, off: 0.1 },
    { min: 3, off: 0.15 },
  ],
  // Optional founder block on /about. Leave name empty to hide it.
  founder: { name: "", role: "Founder", photo: "", quote: "" },
  // Email signup form action URL (Klaviyo, Mailchimp, etc.). Empty hides the signup.
  emailSignupAction: "",
  // Set NEXT_PUBLIC_TIKTOK_PIXEL_ID in your environment to turn the pixel on.
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://happy-pep.vercel.app",
};

export const disclaimer =
  "All products are for laboratory research use only. Not for human or veterinary use. Not intended to diagnose, treat, cure, or prevent any disease. Statements have not been evaluated by the FDA. Must be 21+ to purchase.";
