# Setup: from this repo to the app on 3 iPhones

About 2–3 hours the first time. Do it in this order. Commands run from `canton-hunter/` on a Mac or PC
with Node 22+ and pnpm (`npm i -g pnpm`).

```bash
pnpm install
pnpm test          # core logic tests
pnpm test:db       # database tests (needs local Postgres 16; optional)
```

---

## 1. Supabase (backend)

1. Create a project at supabase.com and pick the **Pro** plan so you get daily backups.
   - Region: **Northeast Asia (Tokyo)** or **Southeast Asia (Singapore)**. Both are close to
     Guangzhou and the roaming eSIM's Hong Kong route.
2. Install the CLI (`npm i -g supabase`) and link the project:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push                                   # applies supabase/migrations
   psql "<your db connection string>" -f supabase/seed.sql   # default config (or paste seed.sql into the SQL editor)
   ```
3. **Auth settings** (Dashboard → Authentication → Providers → Email): turn **off** "Allow new users
   to sign up".
4. Create the 3 team accounts:
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role key> \
   node scripts/create-users.mjs "Mahdy:you@email.com:<password>" "Uncle:uncle@email.com:<password>" "Shabab:shabab@email.com:<password>"
   ```
5. **Edge Function secrets.**
   - Copy `supabase/functions/.env.example` to `supabase/functions/.env` and fill it in. The
     Shopify and Meta values can wait until steps 3–4.
   - Make up a long random `WORKER_SECRET` (for example, `openssl rand -hex 32`).
   ```bash
   supabase secrets set --env-file supabase/functions/.env
   supabase functions deploy worker --no-verify-jwt
   supabase functions deploy api
   ```
6. **Turn on the background worker.** In the Dashboard SQL editor, run this once (the same secret as
   `WORKER_SECRET`):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<WORKER_SECRET value>', 'worker_secret');
   ```
   pg_cron then calls the worker every minute. Check that it runs:
   `select * from cron.job_run_details order by start_time desc limit 5;`
7. Dashboard → Database → Replication: confirm the `supabase_realtime` publication includes
   `finds, pings, scores, votes, research`. The migration adds them.

## 2. Anthropic (the AI)

1. Create an API key at console.anthropic.com and add billing. A budget alert around $200 is plenty.
2. Put it in `supabase/functions/.env` as `ANTHROPIC_API_KEY`, then run `supabase secrets set ...` again.
3. The model is set by `CLAUDE_MODEL` (default `claude-opus-5`). Changing it needs no app update.

## 3. Shopify (landing pages)

1. Create the store (Basic plan) under your umbrella brand name, and set up Shopify Payments.
2. Settings → Apps → Develop apps → **Create an app**. Give it these Admin API scopes:
   `write_products`, `read_products`, `write_publications`, `read_customers`, `read_orders`.
   Install it and copy the **Admin API access token**.
3. Put `SHOPIFY_STORE_DOMAIN` (xxx.myshopify.com), `SHOPIFY_ADMIN_TOKEN`, and optionally
   `SHOPIFY_PUBLIC_DOMAIN` in `.env`, then run `supabase secrets set ...` again.
4. Add the test-product template to your live theme (it doesn't touch any other files):
   ```bash
   npm i -g @shopify/cli
   cd shopify-theme
   shopify theme push --store <xxx.myshopify.com> --live --only templates/product.test-product.json --only sections/canton-test-product.liquid
   ```
   Or paste the two files in by hand: Online Store → Themes → Edit code.
5. Install the **Facebook & Instagram** sales channel app and connect your pixel. It tracks page
   views, add-to-cart and purchases automatically.

## 4. Meta (paid tests)

1. Get Business Manager **verified** now, since this can take days. You also need an ad account
   with a payment method and a Facebook Page (Instagram account optional).
2. Business Settings → Users → **System users** → add an admin system user. Assign it the ad
   account and Page, then generate a token with the `ads_management` and `business_management`
   permissions.
3. Put `META_SYSTEM_USER_TOKEN`, `META_AD_ACCOUNT_ID` (digits only), `META_PAGE_ID` and
   `META_PIXEL_ID` in `.env`, then run `supabase secrets set ...` again.
4. Every campaign the app creates is **PAUSED**. Nothing spends money until someone taps
   **Go live** and confirms.

## 5. The iPhone app (Expo + TestFlight)

1. Join the Apple Developer Program **as an individual** ($99).
2. Create an Expo account, then:
   ```bash
   cd apps/mobile
   npx eas-cli@latest login
   npx eas-cli@latest init            # writes the EAS projectId into app.json
   ```
3. Put your Supabase URL and **anon** key into `apps/mobile/app.json` under `extra.supabaseUrl` and
   `extra.supabaseAnonKey`. The anon key is safe to ship in the app, because row-level security
   protects the data.
4. If you want your own bundle ID, change `ios.bundleIdentifier` in `app.json`.
5. Build and send it to TestFlight:
   ```bash
   npx eas-cli@latest build -p ios --profile production
   npx eas-cli@latest submit -p ios --latest
   ```
6. In App Store Connect:
   - Go to Users and Access and add your uncle and Shabab.
   - In TestFlight → **Internal Testing**, add all 3 of you. Internal testers get builds without
     App Review.
7. Everyone installs **TestFlight** from the App Store, installs Canton Hunter, and signs in.
   - Allow camera, microphone, speech and notifications when asked.
   - On each iPhone: Settings → General → Keyboard → Dictation, and make sure English is
     downloaded, so voice notes transcribe **offline**.

**Shipping fixes during the trip** (JavaScript changes only, no rebuild):
```bash
cd apps/mobile && npx eas-cli@latest update --channel production --message "fix ..."
```
The phones pick up the update the next time the app restarts. Adding native modules needs a new
build (step 5).

## 6. Before you fly (checklist)

- [ ] The field test in BUILD_PLAN.md passed on all 3 phones.
- [ ] Hunt list generated: More → Hunt list → Generate.
- [ ] Every row in More → Settings & verify has been checked against docs/VERIFY.md and marked verified.
- [ ] Hall plan filled in for day 1.
- [ ] Roaming eSIMs tested, and the app syncs over them.

## Troubleshooting

| Problem | Where to look |
|---|---|
| Finds stay "Processing…" | Is the worker running? `select * from jobs order by created_at desc limit 20;` (look at `last_error`). Also check the Vault secrets from step 1.6 and `cron.job_run_details`. |
| "Couldn't process" on a find | Open it and tap **Retry AI**. If it keeps failing, check `jobs.last_error`. |
| Uploads stuck | More → Sync shows file errors. Often fair wifi; they retry on their own. |
| Launch build error | The error shows on the launch screen, and Shopify/Meta messages are passed through. Usually a missing scope or unverified account. |
| Push notifications missing | The EAS projectId must be set (step 5.2), and notifications allowed on the phone. |
