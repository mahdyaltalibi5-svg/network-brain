# Canton Hunter: instructions for Claude Code

Canton Hunter is a private iPhone app for 3 partners (Mahdy, his uncle, Shabab). They are going to
the Canton Fair in Guangzhou from **Oct 28 to Nov 2, 2026** to find products to sell in the US.
The app has three parts:

1. **Capture**: log a product at a booth in 30 seconds or less, even with no internet.
2. **Deal Room**: AI organizes, researches, scores and costs each find. The team votes. The
   supplier pipeline runs from quote to order.
3. **Launch**: turns a chosen winner into a Shopify landing page, a Meta test campaign
   (created paused), ad scripts and a test plan with kill rules.

Read these before writing code:
- `docs/ARCHITECTURE.md`: the system design. It is the source of truth.
- `docs/BUILD_PLAN.md`: milestones and tickets with acceptance criteria. Work tickets in order.
- `docs/VERIFY.md`: facts that change often. Never hardcode them; they go in the `config` table.

## Rules that must never be broken

1. **Capture never waits on the network.** Every capture writes to local SQLite and the phone's
   file system first, then returns instantly. Network work happens later, in the outbox or
   background uploads. Any change that makes Capture wait on a network call is a bug.
2. **No data is ever lost.** Media stays on the device until the server confirms the upload.
   Rows use client-generated UUIDs and are soft-deleted (`deleted_at`). Nothing is ever
   hard-deleted from the client.
3. **Nothing spends money without a human tap.** Meta campaigns are created `PAUSED`. Turning one
   on is a button, and the tap is logged. Budget changes need a human tap too.
4. **Secrets live only in Supabase Edge Function env vars.** The app ships with the Supabase URL
   and anon key only.
5. **Volatile facts go in the `config` table**, never in code: tariff rates, freight rates, fair
   dates and ad minimums. Each one carries a `verified_at` date, shown in the UI.
6. **AI output is a suggestion.** Every AI-filled field can be edited, and the edit wins. Store
   the AI value and the human value separately (`*_ai`, `*_override`); the effective value is
   `override ?? ai`.
7. **Stay in scope.** Build what the current ticket says. If something extra is worth doing,
   write it in `docs/BACKLOG.md` instead of building it.

## Stack (details in ARCHITECTURE.md)

- `apps/mobile`: Expo (React Native, TypeScript, Expo Router), expo-sqlite, expo-camera,
  expo-file-system, expo-speech-recognition, expo-notifications. Distributed through EAS Build and
  TestFlight internal testing. EAS Update ships over-the-air fixes during the trip.
- `supabase/`: Postgres (migrations), Auth, Storage, Realtime, Edge Functions (Deno), pg_cron,
  pg_net.
- `packages/core`: pure TypeScript with no React Native or Deno imports. It holds the zod schemas,
  landed cost, scorecard, dedupe, sync merge and kill rules. It has unit tests.
- AI: the Anthropic TypeScript SDK (`@anthropic-ai/sdk`, loaded as `npm:@anthropic-ai/sdk` in
  Deno), called only from Edge Functions. The model ID comes from the `CLAUDE_MODEL` env var
  (default `claude-opus-5`). Use structured outputs (`client.messages.parse` +
  `zodOutputFormat`). Web research uses the `web_search_20260209` server tool. Before writing
  any Claude API code, load the `claude-api` skill to check current API shapes.

## Commands (run from canton-hunter/)

- `pnpm test`: core unit tests (vitest). They must pass before every commit. This includes a check
  that `supabase/functions/_shared/core` is an up-to-date copy of core.
- `pnpm sync:core`: run after editing `packages/core` (it copies core into the Edge Functions).
- `pnpm gen:seed`: regenerate `supabase/seed.sql` after changing config defaults in core.
- `pnpm test:db`: applies every migration to a throwaway local Postgres 16 and runs
  `supabase/tests/db_test.sql`.
- `pnpm check:functions`: Deno type-check of the Edge Functions.
- `pnpm -C apps/mobile typecheck`, plus
  `cd apps/mobile && npx expo export --platform ios --output-dir /tmp/x` (a full Metro bundle check).
- `cd apps/mobile && npx expo-doctor`
- Deploy and ship: see docs/SETUP.md (`supabase db push`, `supabase functions deploy`,
  `eas build`, `eas update`).

## Conventions

- TypeScript strict everywhere. Zod schemas in `packages/core` are the single definition of every
  entity. The Postgres, SQLite and AI output shapes all derive from them or are checked against
  them in tests.
- Every table has `id uuid` (generated on the client), `created_at`, `updated_at`, `deleted_at`,
  and `created_by`.
- Money is stored in integer cents as `*_cents`; weights in grams; sizes in millimeters.
- UI copy is short, big and thumb-friendly. The people using this are standing in a loud, crowded
  hall holding a bag.
