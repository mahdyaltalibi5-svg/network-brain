import { ph } from "@/lib/ph";

/**
 * Single source of truth for business facts. Pages, JSON-LD, llms.txt and the
 * sitemap all read from here. Replace each ph() with real data when supplied.
 */
export const SITE_URL = "https://summitcustomsuits.com";

export const business = {
  name: "Summit Customs",
  legalName: ph("legal business name, e.g. Summit Customs LLC"),
  tagline: "Bespoke Suits & Image Consulting · Salt Lake City",
  shortDescription:
    "Summit Customs is a Salt Lake City bespoke suit and image consulting studio for high-achieving professionals, grooms and executives across the Wasatch Front.",
  url: SITE_URL,
  email: "Kobe@summitcustomsuits.com",
  phone: ph("studio phone number"),
  phoneHref: ph("phone in E.164 format, e.g. +18015550000"),
  address: {
    street: ph("street address and suite"),
    locality: "Salt Lake City",
    region: "UT",
    postalCode: ph("ZIP code"),
    country: "US",
  },
  geo: {
    latitude: ph("studio latitude"),
    longitude: ph("studio longitude"),
  },
  mapUrl: ph("Google Maps link to the studio"),
  hoursText: ph("opening hours, e.g. Tue–Sat 10am–6pm, by appointment"),
  /** schema.org openingHoursSpecification rows; leave empty until confirmed. */
  openingHours: [] as {
    days: string[];
    opens: string;
    closes: string;
  }[],
  appointmentOnly: ph("confirm: are fittings by appointment only?"),
  priceRange: ph("price range, e.g. $$$ or $1,800–$6,000"),
  foundingYear: ph("year founded"),
  areaServed: ["Salt Lake City", "Park City", "Provo", "Ogden", "Sandy", "Draper"],
  sameAs: [
    ph("Instagram profile URL"),
    ph("Google Business Profile URL"),
    ph("LinkedIn page URL"),
  ],
  /**
   * Google Calendar appointment-schedule booking page. Paste the FULL link from Google Calendar →
   * appointment schedule → Share → "Website embed" (calendar.google.com/calendar/appointments/schedules/…)
   * to show the calendar inline on /book. A short calendar.app.google link also works, as a button
   * (Google blocks short links from being embedded). See lib/booking.ts.
   */
  bookingUrl: ph("Google Calendar appointment schedule link (Share → Website embed URL)"),
  logo: `${SITE_URL}/logo.svg`,
} as const;

/** Studio commitments that appear across many pages. Fill each once here. */
export const studio = {
  bespokeFrom: ph("bespoke two-piece starting price"),
  threePieceFrom: ph("bespoke three-piece starting price"),
  bespokeWeeks: ph("standard bespoke timeline in weeks, e.g. 8–10"),
  fittings: ph("number of fittings included in a bespoke suit, e.g. three"),
  canvas: ph("canvas construction offered: full canvas standard? half canvas available?"),
  handFinishing: ph("hand finishing offered, e.g. hand-padded lapels, working sleeve buttonholes, pick-stitched edges, hand-set collar"),
  mills: ph("fabric mills / merchants carried, e.g. Holland & Sherry, Loro Piana, Vitale Barberis Canonico, Dormeuil"),
  aftercare: ph("aftercare / alteration policy and any complimentary adjustment window"),
  rush: ph("rush policy and minimum lead time (including weddings)"),
  remoteMeasuring: ph("remote measuring process for out-of-town clients and groomsmen"),
  travelFittings: ph("off-site fittings outside Salt Lake City: offered? where? travel fee?"),
  weddingPartyPricing: ph("wedding party pricing or minimum"),
  constructionWeeks: ph("construction lead time in weeks"),
} as const;

export const founder = {
  name: ph("founder full name"),
  role: "Founder & Head Clothier",
  photo: ph("founder portrait, 4:5, min 1200px tall"),
  credentials: [
    ph("tailoring training / apprenticeship, e.g. where and with whom"),
    ph("years of experience fitting and cutting suits"),
    ph("image consulting certification, e.g. AICI or equivalent"),
    ph("notable clients, press or industry recognition"),
  ],
  bio: [
    ph("2–3 sentences on the founder's background and how they came to bespoke tailoring"),
    ph("1–2 sentences on their philosophy of fit and dress for Utah professionals"),
  ],
} as const;

export const fullAddress = `${business.address.street}, ${business.address.locality}, ${business.address.region} ${business.address.postalCode}`;
