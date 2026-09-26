# Build Plan

Today: Sat Sep 26, 2026. Flight: Wed Oct 28. Work tickets in order. Each ticket is done only when
its acceptance criteria (AC) pass and core tests are green. After **Oct 25 (Capture freeze)**, the
capture path ships only critical fixes, through EAS Update.

## Status (updated 2026-09-26)

Code for M0–M5 is written. What was verified in the build environment:
- Core logic: 41 unit tests pass.
- Database: all migrations apply to Postgres 16, and the RLS, sync, job queue, triggers and launch
  state machine tests pass.
- Edge Functions: Deno type-check passes.
- iPhone app: TypeScript passes, a full iOS Metro bundle builds, and expo-doctor passes 21/21.

**Not verified yet.** These need real accounts and real phones, so they are the work for the next
three weeks:

| Needs | Tickets |
|---|---|
| Humans create accounts (docs/SETUP.md, docs/PRE_TRIP.md) | M0-1, M0-6 |
| First TestFlight build on real iPhones | M0-6, then every AC that says "on a real iPhone" |
| A live Anthropic key: tune prompts on 10 real business cards | M2-2 AC, M3-3 AC |
| A Shopify store and Meta ad account | M5-3 AC, M5-4 AC |
| **The field test (Oct 18–20)** | the whole capture path |

Known gaps to watch during the field test:
- Swipe gestures in Nightly Review are buttons for now.
- Photos taken on a teammate's phone show only after that phone uploads them.
- Voice audio stays on the phone that recorded it; only the transcript syncs.
- The sync push is best-effort in the background: iOS decides when background tasks run, so open
  the app to force a sync.

| Milestone | Dates | Outcome |
|---|---|---|
| M0 Foundations | Sep 27 – Sep 29 | Scaffold, Supabase schema, auth, TestFlight build on all 3 phones |
| M1 Capture offline | Sep 30 – Oct 6 | 30-second capture, local DB, outbox, background upload, live feed |
| M2 Brain v1 | Oct 7 – Oct 11 | AI extraction, supplier dedupe, search, pings, phrasebook, hall plan |
| M3 Deal Room | Oct 12 – Oct 18 | Landed cost, scorecard, research, nightly review, pipeline, vetting, samples, hunt list |
| Field test | Oct 18 – Oct 20 | All 3 partners capture 40+ products in a real store in airplane mode |
| M4 Hardening + Content | Oct 21 – Oct 25 | Bug fixes from the field test, content pack, backups, digest. **Capture freeze Oct 25** |
| M5 Launch | Oct 26 – Nov 2 (can finish in China) | Shopify landing page, paused Meta campaign, metrics, kill rules |

---

## M0: Foundations

**M0-1 Accounts** (humans, do this first; see PRE_TRIP.md): Apple Developer (individual), Expo,
Supabase Pro, Anthropic API key, Shopify store.
AC: every login works, and the keys are stored in the password manager.

**M0-2 Monorepo scaffold**
- pnpm workspace containing `packages/core` (TS, zod, vitest), `apps/mobile` (Expo Router TS
  template) and `supabase/` (`supabase init`).
- ESLint and Prettier, `tsconfig` in strict mode.
- Fill in the Commands section of CLAUDE.md.

AC: `pnpm -C packages/core test` passes with one sample test, and the app runs in the iOS
simulator.

**M0-3 Core schemas**
- Zod schemas for every entity in ARCHITECTURE §5, plus the `FindExtraction`, `Research`,
  `LaunchPlan` and `ContentPack` AI output schemas.

AC: the schemas are exported from `@core/schemas`, and type tests compile.

**M0-4 Supabase migrations**
- All tables from §5, with the standard columns and a `server_updated_at` trigger.
- RLS as in §10; FTS and trigram indexes; the `jobs` table.
- `seed.sql` loads the config defaults from VERIFY.md, the scorecard, the vetting checklist and
  kill rules.

AC: `supabase db reset` succeeds, and an anonymous user can read nothing.

**M0-5 Auth + profiles**
- A login screen with the session persisted in SecureStore.
- 3 users created by a seed script. Signups disabled.

AC: a login survives an app restart.

**M0-6 EAS + TestFlight**
- `eas.json` profiles (development, preview, production), `expo-updates` configured, and the
  bundle ID set.

AC: all 3 partners installed the build from TestFlight, and an OTA update reaches the phones.

## M1: Capture offline

**M1-1 Local DB layer**
- expo-sqlite schema that mirrors the synced tables, with migrations, the `outbox` table and an
  FTS5 table.
- A repository API where every write updates the table and the outbox in one transaction.

AC: unit tests (Jest in the app) for write-plus-outbox atomicity.

**M1-2 Capture screen**
- The stepper from ARCHITECTURE §6.1: product photo, card, QR scan, video (hold, 15s max), voice
  (hold, on-device transcript plus a saved audio file), then gut.
- Sticky hall header and the "Same booth" shortcut.
- Images resized to 1600px.

AC:
- A full capture takes 30s or less on a real iPhone.
- It works in airplane mode.
- Killing the app right after the gut tap loses nothing.

**M1-3 Media upload queue**
- The `media-sign` Edge Function, and a background `uploadAsync` queue with retries.
- Upload state shown per find.

AC:
- 20 captures made offline upload on their own after reconnecting, with the app in the background.
- They survive a phone reboot (the queue resumes when the app next opens).

**M1-4 Sync engine**
- `sync_push` and `sync_pull` RPCs; LWW in `packages/core/sync.ts` with tests.
- NetInfo triggers, a 30s loop, and a background task.
- Sync badge.

AC: 2 phones edit different finds offline, reconnect, and both see everything. For the same
row, the latest edit wins.

**M1-5 Feed + Realtime**
- Feed screen with filters.
- A Realtime subscription on `finds` triggers a pull.

AC: phone B shows phone A's capture within 10s of A's upload, when both are online.

## M2: Brain v1

**M2-1 Job worker**
- The `jobs` claim, run and retry loop. pg_cron plus pg_net calls `worker` every minute.
- A DB trigger enqueues `process_find` once a find's required media is uploaded.

AC: a job that fails 3 times ends as `error` with `last_error` set, and stale jobs are requeued.

**M2-2 process_find**
- A Claude call per ARCHITECTURE §6.2 using structured outputs. Load the `claude-api` skill
  first.
- Write the `*_ai` fields, and the supplier upsert.

AC:
- On 10 test captures (make fixtures from real Chinese business cards found online), the company
  name, phone and WeChat are extracted correctly on at least 8.
- Price and MOQ are parsed from transcripts like "two ten FOB, MOQ five hundred".

**M2-3 Supplier dedupe**
- `packages/core/dedupe.ts` with tests; auto-merge; a dupe candidate review UI.

AC: two captures of the same card are merged, and a similar name creates a review candidate.

**M2-4 Find detail (editable)**
- Every field shows `override ?? ai`, and an edit writes the override.
- Low-confidence fields are highlighted.

AC: an edit survives a reprocess.

**M2-5 Search**
- Local FTS5 search (offline) plus server FTS.
- "Search by photo": take a photo, the `describe` function returns a text query, and that runs
  the search.

AC: "lamp" finds a lamp captured 3 days earlier, with no network.

**M2-6 Pings + push**
- Register the Expo push token.
- "Come look" ping with the hall, booth and photo; the offline queue; the push shows the original
  timestamp.

AC: a ping reaches the other 2 phones within 10s when online.

**M2-7 Phrasebook + Quick Translate**
- The bundled bilingual question list, shown full-screen in large type.
- The `translate` Edge Function, with a local cache of the last 50 results.

AC: the phrasebook works in airplane mode.

**M2-8 Hall plan**
- A per-day hall assignment screen that sets the default hall on Capture.

## M3: Deal Room

**M3-1 Landed cost** (`packages/core/landedCost.ts`): implement ARCHITECTURE §7 with golden
tests, including an air case, a sea case and a duty-rate override.
- UI: a breakdown with freight mode, quantity and retail price controls.
- Shows "rates verified on" from config.

AC: the numbers match a hand-checked spreadsheet for 3 cases.

**M3-2 Scorecard**: implement ARCHITECTURE §8 from `config.scorecard`, with tests for the gates,
the weights and the Christmas date. The `score_find` job; ranked list screen.

**M3-3 research_find**
- web_search + the strict `submit_research` tool, per §6.4.
- Nightly enqueue, plus a "Research now" button.
- The research section on find detail, with source links.

AC: 5 test products each get a retail price range and at least 2 sources.

**M3-4 Nightly Review + votes**
- A swipe UI, and a combined verdict once all 3 have voted.
- Auto-shortlist at 2 or more "must test" votes.

**M3-5 Pipeline board + events** (stage enum, with a log of every change).

**M3-6 Vetting gate**
- A checklist from config that blocks moving to `ordered` unless it's complete or an override
  reason is given.

**M3-7 Samples + packing view** (who carries it, which bag, paid, declared value).

**M3-8 Hunt List**
- The `build_hunt_list` job, plus an editable list.
- 🎯 matching shown in the Feed.

AC: this runs before the trip and gives about 30 items.

**M3-9 Morning digest** (07:00 CST push, opens the ranked list).

## Field test (Oct 18–20)
The script:
1. All 3 phones go into airplane mode inside a large store (Costco, Walmart, TJ Maxx). Each
   person captures 40 products in 30 minutes, using fake "business cards" (print 10 Chinese cards
   found online).
2. Kill the app mid-capture 3 times, and reboot one phone with pending uploads.
3. Leave airplane mode. Within 15 minutes everything is synced and processed, and the feed shows
   120 finds.
4. Time 10 captures with a stopwatch. The median must be 30s or less.
5. Run Nightly Review on the results, and confirm that search finds items offline.

File every bug as an M4 ticket.

## M4: Hardening + Content (Oct 21–25)
- **M4-1** Fix the field-test bugs, highest severity first.
- **M4-2** Content Pack job and Content tab (ARCHITECTURE §6.5).
- **M4-3** `export_backup` nightly, plus "Export CSV" through the share sheet.
- **M4-4** Error states and retry buttons everywhere. The "Processing failed" state gets a
  manual retry.
- **M4-5** Performance: the camera cold start takes 1s or less, and the feed scrolls smoothly
  with 1,000 finds.
- **M4-6** A release build to TestFlight plus an EAS Update channel check. **Capture freeze.**

## M5: Launch (Oct 26 – Nov 2)
- **M5-1** Shopify theme: the `test-product` template with sections for the hero, angles, FAQ,
  ship-by date, waitlist form (`{% form 'customer' %}` with a tag) and preorder note. Pushed with
  the Shopify CLI from `shopify-theme/`.
- **M5-2** `launch_plan` job with a review and approve UI.
- **M5-3** `launch_shopify` (productCreate, media, metafields, template suffix). AC: the landing
  URL is live and a waitlist signup appears in Shopify customers with the right tag.
- **M5-4** `launch_meta`: the campaign, ad set and ads created **PAUSED**, plus a "Go live"
  button that logs who tapped it. AC: the campaign shows as paused in Ads Manager with the right
  budget and creative.
- **M5-5** `metrics_pull`, the kill-rules evaluation (`packages/core/killRules.ts` with tests),
  and the recommendation push with a confirmed "Pause" action.
