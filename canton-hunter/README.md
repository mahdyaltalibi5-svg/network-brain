# Canton Hunter

A private iPhone app for the Canton Fair trip (Oct 28 – Nov 2, 2026): log products in 30 seconds
offline, let AI organize, research, cost and rank them overnight, then turn a winner into a Shopify
test page plus a paused $10/day Meta campaign.

| Where | What |
|---|---|
| `apps/mobile` | Expo iPhone app (capture, feed, deal room, review, content, launch, tools) |
| `supabase/` | Postgres schema + sync RPCs + job queue, Edge Functions (`worker`, `api`) |
| `packages/core` | Shared logic: schemas, landed cost, scorecard, dedupe, kill rules, sync |
| `shopify-theme/` | Test-product page template |
| `docs/` | ARCHITECTURE, BUILD_PLAN, SETUP, VERIFY, PRE_TRIP, BACKLOG |

Start with **docs/SETUP.md**.

## Web demo

`vercel.json` builds `apps/mobile` for the web as a **demo**:
- Fake data lives in the browser (localStorage).
- The camera, voice and AI are simulated.
- The real core logic still runs: landed cost, scoring, kill rules, grouping.

Web-only files (`*.web.ts`) replace the phone-only modules, so the iPhone build is unchanged.
Build locally with `pnpm -C apps/mobile exec expo export --platform web`.
