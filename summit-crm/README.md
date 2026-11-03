# Summit CRM

Client pipeline for Summit Customs, plugged into Meta ads:

- **Meta Lead Ads → CRM.** Instant Form leads arrive by webhook within seconds (`/api/meta/webhook`), with campaign, ad set, ad and every form answer. A daily sync (`/api/meta/sync`, Vercel Cron) backfills anything missed.
- **CRM → Meta (Conversions API for CRM).** Every stage change is sent back to Meta as a Conversion Leads event (`Lead`, `Contacted`, `Consultation Booked`, `Consultation Held`, `Purchase` with order value, `Delivered`, `Disqualified`), so campaigns can optimise for people who book and buy, not just form fills.
- **Ads reporting.** Spend per campaign from the ad account, joined with CRM outcomes: cost per lead, cost per booking, cost per order and return on ad spend.
- **Website leads.** The booking page on summitcustomsuits.com posts to `/api/leads`, so website enquiries land in the same pipeline.

It's a separate app from the website on purpose: the site stays fully static, and the CRM has its own database, sign-in and server endpoints.

## Run locally

```bash
cd summit-crm
npm install
cp .env.example .env.local   # set CRM_PASSWORD and CRM_SESSION_SECRET at least
npm run dev                  # http://localhost:3100
```

Without `DATABASE_URL` it uses a built-in Postgres (PGlite) stored in `.data/`.

## Deploy (Vercel)

1. New Vercel project from this repo, **Root Directory `summit-crm`**.
2. Add a Postgres database (e.g. Neon from the Vercel Marketplace) so `DATABASE_URL` is set.
3. Set the variables from `.env.example`. Each Meta feature switches on when its variables are present; `/settings` shows what's connected and the exact webhook URL.
4. Put the deployed `…/api/leads` URL in `CRM_LEADS_URL` in `summit-customs/public/book-consultation.html`.

## Meta setup

See `/settings` in the app for the step-by-step list (webhook subscription, Page token permissions, Conversions API token, system user for ad spend).

## Checks

- `npm run check`: lint, types, unit tests (PGlite + fake Graph API), build, browser tests
- `npm test` / `npm run e2e` individually (`PW_CHROMIUM=/opt/pw-browsers/chromium-*/chrome-linux/chrome` in the cloud sandbox)
