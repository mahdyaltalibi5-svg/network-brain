import { z } from "zod";

// ---------- enums ----------
export const Gut = z.enum(["fire", "good", "meh"]);
export type Gut = z.infer<typeof Gut>;

export const MediaKind = z.enum(["product_photo", "card_photo", "qr_photo", "video", "voice"]);
export type MediaKind = z.infer<typeof MediaKind>;

export const UploadState = z.enum(["pending", "uploading", "uploaded", "error"]);
export type UploadState = z.infer<typeof UploadState>;

export const ProcessingState = z.enum(["pending", "processing", "done", "error"]);
export type ProcessingState = z.infer<typeof ProcessingState>;

export const STAGES = [
  "found",
  "shortlisted",
  "quote_requested",
  "quote_received",
  "sample_requested",
  "sample_in_hand",
  "testing",
  "negotiating",
  "vetting",
  "ordered",
  "qc",
  "shipped",
  "landed",
  "killed",
] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

export const ComplianceRisk = z.enum(["none", "easy", "hard", "blocked"]);
export type ComplianceRisk = z.infer<typeof ComplianceRisk>;

export const Level3 = z.enum(["low", "med", "high"]);
export const Competition = z.enum(["low", "med", "high", "saturated"]);
export type Competition = z.infer<typeof Competition>;

export const FreightMode = z.enum(["air", "express", "sea"]);
export type FreightMode = z.infer<typeof FreightMode>;

export const SampleStatus = z.enum(["requested", "paid", "in_hand", "shipping", "arrived"]);
export const LaunchMode = z.enum(["waitlist", "preorder"]);
export const Recommendation = z.enum(["keep", "kill", "scale"]);
export type Recommendation = z.infer<typeof Recommendation>;

// ---------- synced entities ----------
const base = {
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
};

export const Supplier = z.object({
  ...base,
  name_en: z.string().nullable(),
  name_cn: z.string().nullable(),
  contact_name: z.string().nullable(),
  title: z.string().nullable(),
  phones: z.array(z.string()),
  emails: z.array(z.string()),
  wechat_id: z.string().nullable(),
  wechat_qr_payload: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  booth_code: z.string().nullable(),
  hall: z.string().nullable(),
  is_factory_ai: z.boolean().nullable(),
  is_factory_override: z.boolean().nullable(),
  alibaba_url: z.string().nullable(),
  notes: z.string().nullable(),
  merged_into_id: z.string().uuid().nullable(),
});
export type Supplier = z.infer<typeof Supplier>;

export const Compliance = z.object({
  risk: ComplianceRisk,
  flags: z.array(z.string()),
});
export type Compliance = z.infer<typeof Compliance>;

export const Find = z.object({
  ...base,
  supplier_id: z.string().uuid().nullable(),
  captured_by: z.string().uuid().nullable(),
  captured_at: z.string(),
  day_index: z.number().int().nullable(),
  hall: z.string().nullable(),
  booth_code: z.string().nullable(),
  transcript: z.string().nullable(),
  qr_payload: z.string().nullable(),
  gut: Gut.nullable(),
  title_ai: z.string().nullable(),
  title_override: z.string().nullable(),
  description_ai: z.string().nullable(),
  description_override: z.string().nullable(),
  category_ai: z.string().nullable(),
  category_override: z.string().nullable(),
  tags_ai: z.array(z.string()),
  fob_price_cents: z.number().int().nullable(),
  fob_currency: z.string().nullable(),
  moq: z.number().int().nullable(),
  sample_cost_cents: z.number().int().nullable(),
  lead_time_days: z.number().int().nullable(),
  oem_logo: z.boolean().nullable(),
  packaging_custom: z.boolean().nullable(),
  sells_to_us_sellers: z.boolean().nullable(),
  certifications: z.array(z.string()),
  unit_weight_g: z.number().int().nullable(),
  box_dims_mm: z.array(z.number().int()).nullable(),
  fragile: z.boolean().nullable(),
  giftable_ai: z.boolean().nullable(),
  demo_score_ai: z.number().int().nullable(),
  compliance_ai: Compliance.nullable(),
  compliance_override: Compliance.nullable(),
  hts_guess_ai: z.string().nullable(),
  hunt_item_id: z.string().uuid().nullable(),
  processing_state: ProcessingState,
  stage: Stage,
  killed_reason: z.string().nullable(),
  ai_confidence: z.array(z.object({ field: z.string(), value: z.number() })).nullable(),
  product_key_ai: z.string().nullable(),
  product_group_id: z.string().uuid().nullable(),
  starred: z.boolean(),
  tags_user: z.array(z.string()),
});
export type Find = z.infer<typeof Find>;

export const Media = z.object({
  ...base,
  find_id: z.string().uuid().nullable(),
  supplier_id: z.string().uuid().nullable(),
  kind: MediaKind,
  storage_path: z.string().nullable(),
  upload_state: UploadState,
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  duration_ms: z.number().int().nullable(),
  bytes: z.number().int().nullable(),
  mime: z.string().nullable(),
});
export type Media = z.infer<typeof Media>;

export const Vote = z.object({
  ...base,
  find_id: z.string().uuid(),
  user_id: z.string().uuid(),
  value: z.number().int().min(-1).max(2),
  comment: z.string().nullable(),
});
export type Vote = z.infer<typeof Vote>;

/** Tables that sync between device and server, in dependency order. */
export const SYNCED_TABLES = [
  "profiles",
  "config",
  "hunt_items",
  "hall_assignments",
  "suppliers",
  "supplier_dupe_candidates",
  "finds",
  "media",
  "votes",
  "pings",
  "research",
  "cost_calcs",
  "scores",
  "pipeline_events",
  "vetting",
  "samples",
  "content_items",
  "launches",
  "launch_metrics",
  "followups",
  "entry_notes",
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

/** Tables the device is allowed to write (others are server-computed). */
export const CLIENT_WRITABLE_TABLES: readonly SyncedTable[] = [
  "hunt_items",
  "hall_assignments",
  "suppliers",
  "supplier_dupe_candidates",
  "finds",
  "media",
  "votes",
  "pings",
  "cost_calcs",
  "pipeline_events",
  "vetting",
  "samples",
  "content_items",
  "launches",
  "followups",
  "entry_notes",
];

// ---------- AI output schemas (used with structured outputs) ----------
export const FindExtraction = z.object({
  product: z.object({
    title: z.string().describe("Short, specific US-market product name, max 60 chars"),
    product_key: z.string().describe("Generic product type, 2-5 lowercase words, no brand/color/size, so the same product from different booths matches, e.g. 'sunset projection lamp'"),
    description: z.string().describe("2-3 sentences: what it is, what it does, materials"),
    category: z.string(),
    tags: z.array(z.string()),
    giftable: z.boolean(),
    demo_score_1_5: z.number().describe("How well the product's value shows in a 5-second video, 1-5"),
    fragile: z.boolean(),
    est_unit_weight_g: z.number().nullable(),
    est_box_dims_mm: z.array(z.number()).nullable().describe("[L, W, H] of retail box in mm"),
    hts_guess: z.string().nullable().describe("Best-guess US HTS code, e.g. 9405.49"),
    hts_chapter: z.string().nullable().describe("2-digit HTS chapter, e.g. 94"),
    compliance: Compliance,
    hunt_item_match_title: z.string().nullable(),
  }),
  pricing: z.object({
    fob_price: z.number().nullable(),
    currency: z.string().nullable().describe("ISO code: USD, CNY, ..."),
    moq: z.number().nullable(),
    sample_cost: z.number().nullable(),
    lead_time_days: z.number().nullable(),
  }),
  answers: z.object({
    oem_logo: z.boolean().nullable(),
    packaging_custom: z.boolean().nullable(),
    is_factory: z.boolean().nullable(),
    sells_to_us_sellers: z.boolean().nullable(),
    certifications: z.array(z.string()),
  }),
  supplier: z.object({
    name_en: z.string().nullable(),
    name_cn: z.string().nullable(),
    contact_name: z.string().nullable(),
    title: z.string().nullable(),
    phones: z.array(z.string()),
    emails: z.array(z.string()),
    wechat_id: z.string().nullable(),
    website: z.string().nullable(),
    address: z.string().nullable(),
    booth_code: z.string().nullable(),
    hall: z.string().nullable(),
  }),
  confidence: z.array(z.object({ field: z.string(), value: z.number() })),
});
export type FindExtraction = z.infer<typeof FindExtraction>;

const Listing = z.object({
  platform: z.string(),
  title: z.string(),
  price_usd: z.number().nullable(),
  url: z.string(),
  notes: z.string().nullable(),
});

export const ResearchReport = z.object({
  comparables: z.array(Listing),
  retail_low_usd: z.number().nullable(),
  retail_high_usd: z.number().nullable(),
  competition: Competition,
  competition_notes: z.string(),
  trend_notes: z.string(),
  cheaper_source_found: z.boolean(),
  cheaper_source_notes: z.string().nullable(),
  ip_risk: Level3,
  ip_notes: z.string(),
  summary: z.string().describe("2-3 sentence verdict for the team"),
});
export type ResearchReport = z.infer<typeof ResearchReport>;

export const LaunchPlan = z.object({
  positioning: z.string(),
  target_customer: z.string(),
  angles: z.array(z.object({ name: z.string(), pitch: z.string() })),
  copy: z.object({
    title: z.string(),
    bullets: z.array(z.string()),
    description: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  offer: z.object({
    mode: LaunchMode,
    reason: z.string(),
    price_usd: z.number(),
    compare_at_usd: z.number().nullable(),
  }),
  ad_scripts: z.array(
    z.object({
      hook: z.string(),
      body: z.string(),
      cta: z.string(),
      shot_list: z.array(z.string()),
      uses_existing_footage: z.boolean(),
    }),
  ),
  meta: z.object({
    primary_texts: z.array(z.string()),
    headlines: z.array(z.string()),
  }),
  test_plan: z.object({
    daily_budget_usd: z.number(),
    days: z.number(),
    success_looks_like: z.string(),
    notes: z.string(),
  }),
});
export type LaunchPlan = z.infer<typeof LaunchPlan>;

export const ContentPack = z.object({
  clips: z.array(
    z.object({
      media_id: z.string(),
      hooks: z.array(z.string()),
      caption: z.string(),
      hashtags: z.array(z.string()),
      on_screen_text: z.string(),
      post_order: z.number(),
    }),
  ),
  day_recap_script: z.string(),
});
export type ContentPack = z.infer<typeof ContentPack>;

export const HuntList = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      why: z.string(),
      target_fob_usd: z.number().nullable(),
      target_retail_usd: z.number().nullable(),
      priority: z.number().describe("1 = highest"),
      source_urls: z.array(z.string()),
    }),
  ),
});
export type HuntList = z.infer<typeof HuntList>;

export const PhotoQuery = z.object({
  query: z.string().describe("3-8 search keywords describing the product in the photo"),
});

export const FollowupDraft = z.object({
  subject: z.string().describe("Short subject (used for email)"),
  body_zh: z.string().describe("Message in natural Simplified Chinese, WeChat style: short paragraphs, polite, specific"),
  body_en: z.string().describe("The same message in English, for the team to read"),
  asks: z.array(z.string()).describe("Each concrete thing we are asking for, in English"),
});
export type FollowupDraft = z.infer<typeof FollowupDraft>;

/** The Build guide: the steps that turn a find into a tested product. Order matters. */
export const BUILD_STEPS = [
  { key: "numbers", title: "Check the numbers", why: "Make sure it can make money after freight, tariffs, fees and ads." },
  { key: "sample", title: "Get a sample", why: "Never sell what you haven't held. Film real content with it." },
  { key: "supplier", title: "Vet the supplier", why: "Confirm they're real, can deliver, and take safe payment." },
  { key: "website", title: "Build the landing page", why: "One page on your store: waitlist or preorder, honest ship date." },
  { key: "ads", title: "Make the ads", why: "Real footage beats AI images. Shoot the scripts below." },
  { key: "launch", title: "Launch the $10/day test", why: "Five to seven days on Meta. Nothing spends until you tap Go live." },
  { key: "decide", title: "Read the results and decide", why: "Kill fast if it doesn't work; scale if it does." },
  { key: "order", title: "Place the first order", why: "Only after the test wins and the supplier is vetted." },
] as const;
export type BuildStepKey = (typeof BUILD_STEPS)[number]["key"];
