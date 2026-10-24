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
  phone: "(801) 866-9718",
  phoneHref: "+18018669718",
  address: {
    street: "215 S State St, Suite 575",
    locality: "Salt Lake City",
    region: "UT",
    postalCode: "84111",
    country: "US",
  },
  geo: {
    latitude: "40.7645",
    longitude: "-111.8879",
  },
  mapUrl: "https://www.google.com/maps/place/?q=place_id:ChIJ6_VVx3v1UocRr6uhoW6oEFE",
  hoursText: "Mon–Sat, 10am–6pm MT, by appointment",
  /** schema.org openingHoursSpecification rows; leave empty until confirmed. */
  openingHours: [{ days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "10:00", closes: "18:00" }] as {
    days: string[];
    opens: string;
    closes: string;
  }[],
  appointmentOnly: "By appointment, Monday to Saturday, 10am to 6pm Mountain Time, in person or by video.",
  priceRange: "$$$",
  foundingYear: ph("year founded"),
  areaServed: ["Salt Lake City", "Park City", "Provo", "Ogden", "Sandy", "Draper"],
  sameAs: [
    "https://www.instagram.com/summitcustomsuits/",
    ph("Google Business Profile URL"),
    ph("LinkedIn page URL"),
  ],
  /**
   * Google Calendar appointment-schedule booking page. Paste the FULL link from Google Calendar →
   * appointment schedule → Share → "Website embed" (calendar.google.com/calendar/appointments/schedules/…)
   * to show the calendar inline on /book. A short calendar.app.google link also works, as a button
   * (Google blocks short links from being embedded). See lib/booking.ts.
   */
  bookingUrl:
    "https://calendar.google.com/calendar/appointments/schedules/AcZssZ3_dYpjU_OMJKUaHlPtNLJCi-orQ5WsYBoFfcr3MQfkFvSJHEFG5zAlG-H4hdi0kYrlYXuAz74k?gv=true",
  logo: `${SITE_URL}/logo.svg`,
} as const;

/** Studio commitments that appear across many pages. Fill each once here. */
export const studio = {
  bespokeFrom: ph("bespoke two-piece starting price"),
  threePieceFrom: ph("bespoke three-piece starting price"),
  bespokeWeeks: "5 to 8",
  fittings: ph("number of fittings included in a bespoke suit, e.g. three"),
  canvas: "canvassed construction, with a full floating canvas on our top tier",
  handFinishing: ph("hand finishing offered, e.g. hand-padded lapels, working sleeve buttonholes, pick-stitched edges, hand-set collar"),
  mills: "Dormeuil, Scabal, Vitale Barberis Canonico, Holland & Sherry, Marlane, Marzotto and Fratelli Tallia di Delfino",
  aftercare: ph("aftercare / alteration policy and any complimentary adjustment window"),
  rush: "Rush orders are available in select circumstances; ask when you book",
  remoteMeasuring: ph("remote measuring process for out-of-town clients and groomsmen"),
  travelFittings: ph("off-site fittings outside Salt Lake City: offered? where? travel fee?"),
  weddingPartyPricing: ph("wedding party pricing or minimum"),
  constructionWeeks: ph("construction lead time in weeks"),
} as const;

export const founder = {
  name: "Kobe Apponsah",
  role: "Founder & Master Clothier",
  photo: "/img/kobe-portrait-1100.webp",
  credentials: [
    "A background in high-level sales, where presence decides the room",
    "Works one-on-one with every client, from the first conversation to the final fitting",
    "Custom suiting, wardrobe refinement and image consulting under one roof",
    "Cloth from Dormeuil, Scabal, Vitale Barberis Canonico, Holland & Sherry and more",
  ],
  bio: [
    "My background in high-level sales taught me one thing quickly: the men who win the room don't just speak well; they look like they belong there before they say a word. That's where I come in.",
    "From custom suiting to wardrobe refinement, every detail is intentional. The fit. The fabric. The silhouette. Nothing is accidental. I don't believe in trends. I believe in standards.",
  ],
} as const;

export const fullAddress = `${business.address.street}, ${business.address.locality}, ${business.address.region} ${business.address.postalCode}`;
