# Canton Hunter: Architecture

Status: v1 design, 2026-09-26. Trip: Oct 28 to Nov 2, 2026, in Guangzhou. Users: 3, all on iPhone.

---

## 1. Goals, non-goals, constraints

**Goals**
- Log a product at a booth in **30 seconds or less**, fully offline.
- Organize every find automatically: product, supplier, booth, price, MOQ, category, tags.
- Rank each day's finds overnight, so the team wakes up to a shortlist.
- Show the **real** margin: landed cost including tariffs, freight, fees and ad cost.
- Drive the supplier pipeline from quote to order, with a fraud-vetting gate.
- Turn a winner into a Shopify landing page plus a paused Meta test campaign ($10/day) in about
  1 hour of human time.
- Turn fair footage into daily TikTok content (posted by hand).

**Non-goals for v1**: Android; a web app; a custom checkout; Amazon; TikTok Ads or TikTok Shop
API integration; inventory and reorder management; editing video inside the app; multi-team or
multi-tenant support.

**Hard constraints**

| Constraint | Consequence |
|---|---|
| The Great Firewall blocks Google, Meta, TikTok (international) and some US clouds | The team uses **roaming eSIMs**, which route traffic through Hong Kong. The app still assumes the network is often missing or slow, so it is offline-first. |
| Fair wifi and cell service are bad inside the halls | Capture is 100% local. Uploads run in the background and resume on their own. |
| About 4.5 weeks to build; Capture must be field-tested by about Oct 20 | Build in the order Capture, then Deal Room, then Launch. Launch can ship during the trip through OTA updates. |
| 3 users, one team | No tenant model. Signups are off, and the 3 accounts are created by hand. |
| iPhone only | We can use native iOS features: background uploads, on-device speech recognition, camera barcode scanning. |

---

## 2. System overview

```
┌──────────────────────────── iPhone (Expo app) ────────────────────────────┐
│  Capture UI ─▶ local SQLite (source of truth on device) ◀─ Feed/Deal Room │
│       │              │  outbox (row changes)                              │
│       ▼              ▼                                                    │
│  media files  ─▶ background upload queue (iOS background URLSession)      │
│  (documentDirectory)        │                         ▲ pull changes      │
└─────────────────────────────┼─────────────────────────┼───────────────────┘
                              ▼                         │
┌──────────────────────────── Supabase ─────────────────┴───────────────────┐
│ Storage (media bucket)   Postgres (+ RLS, pg_cron, pg_net, FTS, pg_trgm)  │
│        │                   │  rows ──trigger──▶ jobs table                │
│        │                   ▼                                              │
│        │     Edge Function `worker` (pg_cron every minute, claims jobs)   │
│        │        ├─ process_find   (vision + extraction, Claude)           │
│        │        ├─ dedupe_supplier                                        │
│        │        ├─ research_find  (Claude + web_search, overnight)        │
│        │        ├─ score_find     (pure core code)                        │
│        │        ├─ content_pack   (nightly, Claude)                       │
│        │        ├─ launch_*       (Shopify Admin API, Meta Marketing API) │
│        │        ├─ metrics_pull   (daily, Meta + Shopify)                 │
│        │        └─ export_backup  (nightly JSON/CSV to Storage)           │
│ Realtime (live feed and pings)      Expo Push (via Edge Function)         │
└───────────────────────────────────────────────────────────────────────────┘
        External: Anthropic API · Shopify Admin GraphQL · Meta Marketing API · Expo Push
```

---

## 3. Tech choices (decided, with reasons)

| Area | Choice | Why |
|---|---|---|
| App | **Expo SDK (latest stable), React Native, TypeScript, Expo Router** | Native camera, file system, background upload and speech with one TS codebase. EAS Update gives OTA fixes while in China. |
| Local DB | **expo-sqlite** (FTS5 enabled) + a thin query layer (Drizzle ORM for expo-sqlite, or hand-written SQL) | A real database on the phone that survives app kills, with offline search. |
| Media | expo-camera (photo, video, QR scanning), expo-image-manipulator (resize to 1600px JPEG, q≈0.7), expo-file-system `uploadAsync` with `sessionType: BACKGROUND` | Uploads keep going when the app is in the background. |
| Voice | **expo-speech-recognition** with `requiresOnDeviceRecognition: true` (en-US) and the audio file persisted | Works offline, with no third-party audio API. The audio file is kept as a backup. |
| Backend | **Supabase** (Pro plan): Postgres, Auth, Storage, Realtime, Edge Functions, pg_cron, pg_net | One vendor, SQL we control, daily backups on Pro. |
| AI | **Anthropic API** through `@anthropic-ai/sdk`, only in Edge Functions. Model comes from the `CLAUDE_MODEL` env var, default `claude-opus-5`. | Strong vision (Chinese business cards), structured outputs, server-side web search. |
| Store | **Shopify (Basic plan), one umbrella brand store**, driven by the Admin GraphQL API | Checkout, tax and fraud are solved. One store means one pixel that learns across every test. |
| Paid ads | **Meta Marketing API** (a system user token from our own Business Manager) | $10/day works on Meta. TikTok's ad minimums are higher (see VERIFY.md). |
| TikTok | **Organic, posted by hand**, fed by the in-app Content Pack | The TikTok posting API needs an app audit, and we don't have time for that. |
| Push | expo-notifications + the Expo Push API, called from Edge Functions | Pings and the morning digest. |
| Distribution | Apple Developer Program → EAS Build → **TestFlight internal testing** | 3 testers, no App Review wait. |

**Model settings for the app's runtime AI.** This is separate from the model that writes the code.
- Default model is `claude-opus-5`, set through an env var so it can change without a code change.
- Adaptive thinking.
- `output_config.effort`: `low` for extraction, `medium` for research and content, `high` for
  launch copy and plans.
- Use structured outputs (`client.messages.parse` with `zodOutputFormat`) for every extraction.
- Research calls use `{type: "web_search_20260209", name: "web_search", max_uses: 6}`, and the
  final report comes back through a `strict: true` client tool named `submit_research`
  (`tool_choice: auto`, with the prompt telling the model to call it). Don't use forced
  `tool_choice`, because newer models reject it.
- Always check `stop_reason` (`refusal`, `max_tokens`) before reading output.
- Load the `claude-api` skill before writing this code, and enable server-side refusal fallbacks
  as that skill says.
- Cost ballpark: a few cents per find processed and about $0.10–0.30 per researched find. The
  whole trip should cost well under $200 in API spend.

---

## 4. Offline-first sync

### 4.1 Principles
- The **device SQLite is the source of truth for the UI**. Screens read only local data.
- Every row gets a client UUID v7 (time-sortable). There are no server-generated IDs for user data.
- Writes go to the local table **and** to `outbox(id, table, row_id, op, payload, attempts,
  last_error)` in the same SQLite transaction.
- Conflicts are resolved **last-write-wins per row** by `updated_at`, which is set on the client
  and fixed by the server if clock skew exceeds 24h. Almost all data is append-mostly and
  single-author, so this is good enough.
- Deletes are soft: `deleted_at` is set, and the row syncs like any other change.

### 4.2 Push (device → server)
- The sync loop runs when the app is foregrounded, on network regain (NetInfo), every 30s while
  online, and in a background task (expo-background-task, best effort).
- It sends batches of up to 100 outbox entries to `rpc sync_push(changes jsonb)`. That RPC is a
  Postgres function that upserts each row with `ON CONFLICT (id) DO UPDATE ... WHERE
  excluded.updated_at > t.updated_at`. It returns accepted and rejected IDs.
- Accepted entries are deleted from the outbox. Failures back off exponentially. The UI shows a
  small sync badge ("12 waiting").

### 4.3 Pull (server → device)
- `rpc sync_pull(since timestamptz)` returns changed rows from all synced tables, where
  `server_updated_at > since`. The column is set by a trigger so client clock skew can't break it.
- Pull also runs when a Realtime event arrives, so teammates' finds show up live.

### 4.4 Media
1. The capture saves files to `documentDirectory/media/<uuid>.jpg|mp4|m4a` and inserts a `media`
   row with `upload_state='pending'`.
2. The uploader asks the Edge Function `media-sign` for a signed upload URL (Storage
   `createSignedUploadUrl`), then calls `FileSystem.uploadAsync(url, fileUri, { sessionType:
   BACKGROUND, httpMethod: 'PUT' })`.
3. On success it sets `upload_state='uploaded'` and syncs the row. The server trigger enqueues AI
   jobs only once all required media for a find is uploaded.
4. **The local file is never deleted automatically in v1.** Phones have room. An "Free up space"
   button later can delete files that are confirmed uploaded and more than 7 days old.
5. Size budget: a photo is about 300 KB after resizing; video is capped at 15s, 720p (about 8 MB).

---

## 5. Data model (Postgres; SQLite mirrors the synced tables)

Every table has: `id uuid pk`, `created_at`, `updated_at`, `server_updated_at`, `deleted_at`,
`created_by uuid → profiles`.

```text
profiles        (id = auth.users.id, name, color, expo_push_token)
config          (key text pk, value jsonb, verified_at date, note)        -- see VERIFY.md
hunt_items      (title, category, why, target_retail_cents, target_fob_cents, priority, source_urls[])
hall_assignments(date, user_id, halls text[], note)

suppliers       (name_en, name_cn, contact_name, title, phones[], emails[], wechat_id,
                 wechat_qr_payload, website, address, booth_code, hall, is_factory_ai,
                 is_factory_override, alibaba_url, notes, merged_into_id uuid null)
supplier_dupe_candidates (supplier_a, supplier_b, score, reasons[], status: open|merged|dismissed)

finds           (supplier_id null, captured_by, captured_at, day_index,          -- product seen at a booth
                 hall, booth_code,
                 transcript, gut: fire|good|meh,
                 title_ai, title_override, description_ai, category_ai, tags_ai[],
                 fob_price_cents, fob_currency, moq, sample_cost_cents, lead_time_days,
                 oem_logo bool null, packaging_custom bool null, sells_to_us_sellers bool null,
                 certifications text[], unit_weight_g, box_dims_mm int[3], fragile bool null,
                 giftable_ai bool, demo_score_ai int(1-5), compliance_ai jsonb, hts_guess_ai,
                 hunt_item_id null, processing_state: pending|processing|done|error,
                 search_doc tsvector (server), stage (pipeline enum), killed_reason)
                 -- every *_ai field has an optional *_override; the effective value is override ?? ai
media           (find_id null, supplier_id null, kind: product_photo|card_photo|qr_photo|video|voice,
                 local_uri, storage_path, upload_state, width, height, duration_ms, bytes)
votes           (find_id, user_id, value: -1|0|1|2 [2 = "must test"], comment)  unique(find_id,user_id)
pings           (find_id null, from_user, hall, booth_code, message, sent_at)
research        (find_id, status, amazon jsonb, tiktok_shop jsonb, aliexpress_1688 jsonb,
                 retail_low_cents, retail_high_cents, competition: low|med|high|saturated,
                 trend_notes, ip_risk: low|med|high, ip_notes, sources jsonb[], model, cost_usd)
cost_calcs      (find_id, inputs jsonb, outputs jsonb, config_snapshot jsonb, computed_at)   -- see §7
scores          (find_id, total, breakdown jsonb, gates_failed text[], computed_at)
pipeline_events (find_id, from_stage, to_stage, by_user, note)
vetting         (find_id, checklist jsonb, override_reason, completed_at)
samples         (find_id, supplier_id, status: requested|paid|in_hand|shipping|arrived,
                 carried_by user, bag_label, paid_cents, declared_value_cents, tracking)
content_items   (date, media_id, hooks text[], caption, hashtags text[], on_screen_text,
                 posted bool, posted_url)
launches        (find_id, status, mode: waitlist|preorder, ship_by_date,
                 shopify_product_id, shopify_handle, landing_url,
                 copy jsonb, ad_scripts jsonb, shot_list jsonb, plan jsonb,
                 meta_campaign_id, meta_adset_id, meta_ad_ids text[], meta_status: none|paused|active,
                 activated_by, activated_at, kill_rules jsonb)
launch_metrics  (launch_id, date, spend_cents, impressions, clicks, ctr, cpc_cents,
                 lp_views, sessions, add_to_carts, waitlist_signups, preorders, revenue_cents,
                 recommendation: keep|kill|scale, reason)
jobs            (type, payload jsonb, status: queued|running|done|error, attempts, run_after,
                 locked_at, last_error)        -- server-only, not synced
exports         (date, storage_path, row_counts jsonb)                                -- server-only
```

The pipeline `stage` enum on finds:
```
found → shortlisted → quote_requested → quote_received → sample_requested → sample_in_hand
      → testing → negotiating → vetting → ordered → qc → shipped → landed
(killed from any stage, with killed_reason)
```

**RLS**: every table allows select, insert and update when `auth.uid() in (select id from
profiles)`. Signups are disabled in Auth settings. `jobs`, `exports` and the `config` writes are
limited to the service role; config edits happen through an admin RPC.

**Search**:
- Server side, a `search_doc` tsvector (English config) is built from the title, description,
  tags, transcript, supplier names (EN and pinyin-free CN chars as-is) and booth code, plus a
  `pg_trgm` index on the title and supplier name.
- On the device, an SQLite FTS5 virtual table over the same fields, kept in sync by triggers.

---

## 6. Modules

### 6.1 Capture (fully offline)

**Screen: Capture.** It opens straight to the camera from the tab bar.

Sticky header: `Hall [11.2 ▾]` and the current day. The hall persists until changed and defaults
to today's hall assignment.

The flow is a stepper along one bottom bar, with one big shutter button:
1. **Product photo** (required). One tap, and more can be added with a quick second tap.
2. **Business card** (required unless the supplier was picked from "Same booth as last"). Card
   front; a back side can be added.
3. **WeChat QR** (optional). Live barcode scanning stores the payload, and a photo is saved too.
4. **Video** (optional). Hold to record, 15s max, 720p.
5. **Voice note** (optional but encouraged). Hold to talk. On-device transcription shows live
   text, and the audio is kept.
   - Prompt shown: "Name, price, MOQ, logo? factory? anything else".
6. **Gut**: 🔥 / 👍 / 🤷. One tap saves and returns to step 1.

Performance targets:
- Each step is at most 1 tap. The whole flow takes 30s or less.
- The camera is ready within 1s of the app opening.
- Saving never blocks (it's a local transaction only).

Extras:
- **"Same booth" shortcut**: the next capture reuses the previous card and supplier. Useful when
  logging several products at one booth.
- **Supplier questions card** (item 5): swipe up on Capture to show the bundled bilingual
  question list (EN and 中文, large text) to hand to the supplier. It works offline. See §6.6.
- **"Come look" ping** (item 4): a button on the saved-find toast. It sends a push to the other
  two with the hall, booth, photo and an optional one-line voice note. It queues while offline and
  the push shows the original timestamp.

**Screen: Feed.** A live list of all finds from all 3 users, newest first. Each card shows the
photo, AI title (or "Processing…"), who logged it, the hall and booth, the gut score and the sync
state. Filters: today, mine, 🔥 only, hall.

### 6.2 AI processing (`process_find` job)

The job is enqueued when a find and its required media are uploaded. It makes one Claude call
with:
- the product photos, card photos (front and back) and the QR payload;
- the transcript;
- the current hall;
- the active hunt list (titles only);
- the scorecard definitions.

It returns `FindExtraction` (a zod schema in `packages/core`):

```ts
FindExtraction = {
  product: { title, description, category, tags[], giftable, demo_score_1_5, fragile,
             est_unit_weight_g, est_box_dims_mm, hts_guess, hts_chapter,
             compliance: { risk: 'none'|'easy'|'hard'|'blocked', flags: string[] } // CPC/kids<12, FCC, FDA food-contact, cosmetics, batteries(UN38.3), Prop65, knockoff-lookalike
             hunt_item_match_title | null },
  pricing: { fob_price, currency, moq, sample_cost, lead_time_days } // from transcript; null if not said
  answers: { oem_logo, packaging_custom, is_factory, sells_to_us_sellers, certifications[] },
  supplier: { name_en, name_cn, contact_name, title, phones[], emails[], wechat_id,
              website, address, booth_code, hall }   // from card OCR (Chinese + English) + transcript
  confidence: { field -> 0..1 } // used to highlight fields to double-check
}
```

After the call:
- The server writes the `*_ai` fields and upserts the supplier (see dedupe).
- It enqueues `score_find`.
- It sets `processing_state='done'`. On error it retries 3 times with backoff, then sets `error`.
  The Feed shows a retry button.

**Supplier dedupe** (`packages/core/dedupe.ts`, run on the server):
- Normalize phones to E.164 and emails, company names (lowercased, with legal suffixes like
  "Co., Ltd" and 有限公司 stripped), and booth codes.
- **Auto-merge** when phone, email, WeChat ID or (booth code + same fair phase) match.
- When the trigram similarity of the names is ≥ 0.6, create a `supplier_dupe_candidate` for a
  human to review.
- A merge sets `merged_into_id` and repoints the finds. Nothing is deleted.

### 6.3 Deal Room

**Morning Digest** (push at 07:00 Asia/Shanghai): "37 new finds yesterday. Top 5: …". It opens
the ranked list.

**Ranked list**: finds sorted by `scores.total`, with filters (day, category, stage, gate
failures hidden or shown). Each row shows the score, margin multiple, the arrive-by-Christmas
flag and the vote dots.

**Find detail**:
- Photos and video.
- Every extracted field, editable.
- Supplier card with tap-to-copy WeChat ID and the QR image.
- The research report with source links.
- The landed cost breakdown (§7) with sliders for air or sea freight, quantity and retail price.
- The score breakdown (§8).
- Votes and comments.
- A pipeline stage selector.
- Samples.
- "Launch this" (enabled only at stage ≥ shortlisted).

**Nightly Review mode** (item 4): a swipe UI over today's finds with gut 🔥 or 👍, or with a
score of at least the threshold. Each user swipes left (-1), up (1) or right (2 = must test).
Once all 3 have voted on a find, a combined verdict appears. A find with at least 2 "must test"
votes goes to `shortlisted` automatically.

**Pipeline board**: finds grouped by stage. Each stage change logs a `pipeline_event`.

**Vetting gate** (item 6): moving a find to `ordered` requires every item in its `vetting`
checklist, or an override reason, which is logged and shown in red. The default checklist lives
in the `config` key `vetting_checklist`:
- Business license seen, and the company name matches the invoice.
- Factory vs. trading company confirmed (factory visit, video call, or license scope).
- Payment is through Alibaba Trade Assurance, or to a **company** bank account whose name matches
  the license. Never to a personal account.
- A sample was received and approved, and photos were saved.
- The spec sheet and a Proforma Invoice with specs, packaging, lead time and penalties are signed.
- A pre-shipment QC inspection is booked (third party).
- Certification documents are received, if the compliance risk is not `none`.

**Samples and suitcase** (item 7): the sample list shows who carries it and which bag ("Mahdy –
grey suitcase"), what was paid and the declared value. There's also a packing view grouped by bag.

**Hunt List** (item 2, pre-trip):
- A screen plus the job `build_hunt_list`: Claude with web search researches what's trending on
  TikTok Shop and Amazon US in the fair's categories and suggests about 30 hunt items (category,
  why, target FOB and retail price).
- Humans edit the list.
- During capture, `process_find` tags matches, and the Feed shows a 🎯 badge on them.

**Hall plan** (item 4): a simple per-day screen that assigns halls to each user. It sets the
default hall on Capture.

### 6.4 Research (`research_find` job, overnight)

pg_cron runs at 01:00 Asia/Shanghai. It enqueues research for the day's finds with gut ≥ 👍, a
vote ≥ 1, or a hunt match. It is also callable on demand with a "Research now" button.

The Claude call:
- Uses `web_search_20260209` with `max_uses: 6` and `effort: medium`.
- Input: the title, description, photo and category.
- Task: find comparable products on Amazon US, TikTok Shop US, AliExpress and 1688, and report:
  - US retail price range;
  - competition level (how many sellers are listing near-identical products; whether there are
    big brands);
  - trend signals;
  - whether 1688 or AliExpress sells it cheaper than the quoted FOB price;
  - IP risk (does it look like a patented or trademarked brand product?).
- It returns through the strict `submit_research` tool. Store the URLs in `sources`, and the
  model name and cost.
- Then it enqueues `score_find`.

Keep each job under the Edge Function wall-clock limit. If a job runs long, lower `max_uses`
before splitting it.

### 6.5 Content Pack (item 3)

The nightly `content_pack` job, run at 22:00 Asia/Shanghai:
- Picks the day's top 5–8 videos, ranked by score and gut and spread across users.
- Claude writes, for each clip: 3 hooks, a caption, hashtags, on-screen text, and a
  suggested post order.
- It also writes one "day recap" script for the "we flew to China to find products" format.

The Content tab:
- Each clip has "Save video to Photos", "Copy caption" and "Open TikTok". Editing happens in
  CapCut, and posting is manual.
- A "Mark posted" button with a URL field.

### 6.6 Supplier questions and translation (item 5)

- Bundled JSON `packages/core/phrasebook.ts` holds about 15 questions in EN and 中文 (with pinyin
  optional): MOQ, unit price at MOQ and at 5× MOQ, sample cost and shipping, lead time, custom
  logo, custom packaging, factory or trader, whether they already sell to US Amazon or TikTok
  sellers, certifications (CE/FCC/CPC/FDA), whether they accept Trade Assurance, and product
  weight and carton size.
- It displays full-screen in a large font. It works offline.
- **Quick Translate** (online only): speak or type English, and an Edge Function returns Chinese
  from Claude with `effort: low`. Show it large. The last 50 translations are cached locally.

### 6.7 Launch (Part 3)

A launch is created from a find at stage ≥ shortlisted. The steps run as jobs, and the UI shows a
checklist.

1. **`launch_plan`** (Claude, `effort: high`). Inputs: the find, research, cost calc, score and
   available media. Outputs (a zod schema):
   - positioning, target customer, 3 angles;
   - product copy: title, 5 bullets, description, FAQ;
   - offer mode (`waitlist` or `preorder`, with a reason) and price;
   - 5 UGC ad scripts, each with a hook, body, CTA and shot list, sized for the footage we have
     or can shoot in Utah;
   - 3 primary texts and 3 headlines for Meta;
   - test plan: budget ($10/day per product), duration (5–7 days), and kill rules in JSON (see
     below).
2. **Human review**: every field is editable, followed by an **Approve** tap.
3. **`launch_shopify`**:
   - Create the product in the umbrella store through the Admin GraphQL API (`productCreate`
     plus media from Storage URLs), with the `template_suffix` set to `test-product`.
   - Set metafields for the theme sections: hero, angles, FAQ, ship-by text.
   - **Waitlist mode**: the product is not purchasable. The theme section renders a Liquid
     `{% form 'customer' %}` that saves an email with the tag `waitlist-<handle>`.
   - **Preorder mode**: purchasable with inventory policy CONTINUE. The ship-by date, computed
     from the lead time plus freight plus a buffer, is shown on the page and in the order
     confirmation. **FTC Mail Order Rule**: ship by the stated date, or notify the customer and
     offer a refund.
   - Save the `landing_url`.
4. **`launch_meta`**: create a campaign (objective: Leads for waitlist, Sales for preorder), one
   ad set at $10/day with broad US targeting and the Advantage+ audience, and up to 3 ads from the
   uploaded videos with the generated copy. **Everything is created with status `PAUSED`.** Uses
   Marketing API calls with a system user token and our ad account ID, both from env vars. The
   pixel is installed by Shopify's Facebook & Instagram channel app, which is set up by hand once.
5. **Activate**: a human taps "Go live" in the app. The call sets the campaign and ad set to
   ACTIVE and logs `activated_by` and `activated_at`.
6. **`metrics_pull`** (daily at 09:00 America/Denver, plus on demand):
   - Pull Meta insights (spend, impressions, clicks, CTR, CPC, landing page views) and Shopify
     data (sessions if available, orders tagged preorder, waitlist customers with the tag).
   - Evaluate the kill rules with the pure function `packages/core/killRules.ts`.
   - Write the recommendation and push it: "Kill: LED lamp. CTR 0.4% after $40".
   - **Never pause or scale automatically.** The push has a one-tap "Pause" action that needs
     confirmation.

Default kill rules (the `config` key `kill_rules_default`, editable per launch):
```json
{ "min_spend_before_judging_cents": 3000,
  "kill_if": [ {"metric":"ctr","op":"<","value":0.008,"after_spend_cents":3000},
               {"metric":"cost_per_signup_cents","op":">","value":300,"after_spend_cents":4000},
               {"metric":"cost_per_preorder_cents","op":">","value_expr":"0.5*gross_margin_cents","after_spend_cents":5000} ],
  "scale_if": [ {"metric":"cost_per_preorder_cents","op":"<","value_expr":"0.3*gross_margin_cents","min_events":3} ],
  "max_days": 7 }
```

Once a product is in US inventory, TikTok Shop and TikTok Ads are added. That is v2 and out of
scope.

### 6.8 Backup and export (item 9)
- Supabase Pro daily backups.
- The nightly `export_backup` job writes the full JSON plus CSVs (finds, suppliers, samples) to
  `storage://exports/YYYY-MM-DD/`.
- The in-app "Export CSV" action uses the share sheet.
- Local device data stays on the phone until it is uploaded (§4.4). A lost phone loses only the
  un-synced captures.

---

## 7. Landed cost (`packages/core/landedCost.ts`)

This is a pure function. Every rate comes from `config` (see VERIFY.md), and the `config_snapshot`
used is stored with each result.

```
inputs:  fob_unit (USD), qty, unit_weight_g, carton dims/qty per carton (or unit dims),
         mode: air|sea|express, retail_price, est_cpa (default from config),
         hts_chapter / override duty rate
chargeable_kg_air = max(actual_kg, L*W*H(cm)/6000) per unit (express uses /5000)
freight_unit      = air: rate_per_kg * chargeable_kg ; sea: rate_per_cbm * unit_cbm ; + origin fees/qty
customs_value     = fob_unit * qty
duty              = customs_value * (base_rate[hts_chapter] + china_additional_rate_total)
mpf               = clamp(customs_value * mpf_rate, mpf_min, mpf_max)       (formal entry)
hmf               = sea ? customs_value * hmf_rate : 0
broker_fees       = config.customs_broker_flat
landed_unit       = fob_unit + freight_unit + (duty + mpf + hmf + broker_fees)/qty
per_order_costs   = fulfillment_per_order + packaging + payment_fee_rate*retail + payment_fee_fixed
gross_margin      = retail - landed_unit - per_order_costs
margin_after_ads  = gross_margin - est_cpa
outputs: landed_unit, gross_margin, margin_multiple = retail / landed_unit,
         breakeven_cpa = gross_margin, breakeven_roas = retail / gross_margin,
         arrive_by_date (see §8), warnings[] (e.g. "duty rate unverified > 14 days")
```

The UI shows each line item and a "rates verified on" date. It uses the research price range
midpoint as the default retail price, which can be overridden.

---

## 8. Scorecard (`packages/core/scorecard.ts`, item 2)

The definition lives in `config.scorecard`, so weights can be tuned without an app release.

**Gates.** Failing a gate puts the find at the bottom with a red reason. The team can override.
- `margin_multiple ≥ 3.0`
- `compliance.risk != 'blocked'`
- `ip_risk != 'high'`

**Weighted criteria (0–10 each, then weighted):**

| Criterion | Source | Default weight |
|---|---|---|
| Margin multiple (3× → 5, 5×+ → 10) | cost calc | 20 |
| Demo-ability / "wow" in 5s video | `demo_score_ai` | 15 |
| Christmas feasible | `arrive_by_date ≤ config.christmas_cutoff` (default Dec 10) | 15 |
| Small, light, not fragile (air-friendly) | weight/dims/fragile | 10 |
| Low competition | research | 15 |
| Private-label possible | `oem_logo` | 10 |
| Compliance ease (none 10, easy 6, hard 2) | compliance | 10 |
| Giftable | `giftable_ai` | 5 |
| Team heat | gut + votes | bonus up to +10 |

`arrive_by_date = today + sample_days (if no sample yet) + lead_time_days +
transit_days[mode] + customs_days`. The defaults (air 7–12, express 4–7, customs 3–5) are in
config.

---

## 9. Jobs and schedules

| Job | Trigger | Model / effort |
|---|---|---|
| `process_find` | a find's media is fully uploaded (trigger → `jobs`) | Claude, low |
| `dedupe_supplier` | after process_find | none (core) |
| `score_find` | after process, research, cost edit or vote | none (core) |
| `research_find` | 01:00 CST nightly + on demand | Claude + web_search, medium |
| `content_pack` | 22:00 CST nightly + on demand | Claude, medium |
| `morning_digest` | 07:00 CST | none (push) |
| `build_hunt_list` | on demand (pre-trip) | Claude + web_search, high |
| `translate` | synchronous Edge Function (not a job) | Claude, low |
| `launch_plan` / `launch_shopify` / `launch_meta` | user action | Claude high / API |
| `metrics_pull` | 09:00 America/Denver + on demand | none |
| `export_backup` | 03:00 CST | none |

The worker is the Edge Function `worker`, invoked by pg_cron through pg_net every minute.
- It claims up to N jobs with `UPDATE ... SET status='running', locked_at=now() WHERE id IN
  (SELECT id FROM jobs WHERE status='queued' AND run_after<=now() ORDER BY created_at LIMIT N FOR
  UPDATE SKIP LOCKED) RETURNING *`.
- It runs each job with a timeout and marks it `done`, or requeues it with backoff.
- Stale `running` jobs older than 10 minutes are requeued.
- Every Claude call logs model, tokens and cost into `jobs.payload.usage`.

---

## 10. Security
- Auth: email and password for 3 hand-created users. The session is persisted in SecureStore,
  so there's no re-login while abroad. Signups are disabled.
- Secrets exist only in Edge Function env vars: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`,
  `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_TOKEN`, `META_SYSTEM_USER_TOKEN`, `META_AD_ACCOUNT_ID`,
  `META_PAGE_ID`, `EXPO_ACCESS_TOKEN`.
- The Storage bucket `media` is private. The app reads through short-lived signed URLs and caches
  images locally.
- Media URLs sent to Shopify and Meta are signed URLs that live 1 hour.

---

## 11. Repo layout

```
canton-hunter/
  CLAUDE.md
  docs/  ARCHITECTURE.md  BUILD_PLAN.md  VERIFY.md  PRE_TRIP.md  BACKLOG.md
  packages/core/          # pure TS + zod + vitest
    src/schemas/*.ts  landedCost.ts  scorecard.ts  dedupe.ts  killRules.ts  phrasebook.ts  sync.ts
  apps/mobile/            # Expo app
    app/(tabs)/capture.tsx feed.tsx dealroom.tsx content.tsx more.tsx
    app/find/[id].tsx  app/review.tsx  app/launch/[id].tsx ...
    src/db/ (sqlite schema, migrations, outbox, fts)  src/sync/  src/media/  src/voice/
  supabase/
    migrations/*.sql   seed.sql (config defaults, phrasebook, vetting checklist, scorecard)
    functions/worker/  functions/media-sign/  functions/translate/  functions/_shared/
  shopify-theme/          # test-product template + sections (Liquid), pushed with shopify CLI
```

`packages/core` is shared by the app (through a Metro `watchFolders` workspace) and by the Edge
Functions (import map `"@core/": "../../../packages/core/src/"`). If Supabase bundling rejects
paths outside `functions/`, a prebuild script copies `packages/core/src` into
`functions/_shared/core` (commit the script, not the copy).

This project lives in a subfolder of `network-brain` for now. Moving it to its own repository is
recommended. It shares no code with the Network Brain visualization.

---

## 12. Testing and field test
- **Unit** (vitest, `packages/core`): landed cost with golden cases, scorecard gates and weights,
  dedupe normalization and matching, kill rules, sync LWW merge. These are required.
- **DB**: `supabase db reset` + SQL tests for `sync_push`/`sync_pull` LWW and RLS (pgTAP, or a
  simple script).
- **Manual iOS test script** (`docs/BUILD_PLAN.md` → Field Test):
  - 40 captures in airplane mode;
  - kill the app mid-capture;
  - reboot the phone with a pending upload;
  - 3 phones capturing at once;
  - reconnect and confirm everything syncs;
  - dedupe works on 2 captures of the same card.
