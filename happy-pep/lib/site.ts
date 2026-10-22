// Edit these before launch.
export const site = {
  name: "Happy Pep",
  email: "hello@happypep.com",
  // Where same-day delivery is available. Shown on the shipping policy.
  sameDayZones: ["Salt Lake County", "Utah County", "Davis County"],
  // Order cutoff for same-day Utah delivery, in Mountain Time (24h).
  cutoffHour: 12,
  timeZone: "America/Denver",
  // Set NEXT_PUBLIC_TIKTOK_PIXEL_ID in your environment to turn the pixel on.
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "",
};

export const disclaimer =
  "All products are for laboratory research use only. Not for human or veterinary use. Not intended to diagnose, treat, cure, or prevent any disease. Statements have not been evaluated by the FDA. Must be 21+ to purchase.";
