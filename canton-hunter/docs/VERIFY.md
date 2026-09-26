# VERIFY: facts that change

Everything here is seeded into the `config` table with a `verified_at` date. **None of these
values are confirmed.** They are placeholders based on past patterns. A human must check each
against the official source and update `verified_at` before the trip. The app warns when a value
is unverified or more than 14 days old.

| Config key | Placeholder | Verify at |
|---|---|---|
| `fair_phases` | Autumn phases follow the pattern: P1 ~Oct 15–19 (electronics, hardware, tools), P2 ~Oct 23–27 (consumer goods, home, gifts), P3 ~Oct 31–Nov 4 (apparel, bags, toys, kids, personal care, health, pet, office) | cantonfair.org.cn: **check before anything else**. Trip dates Oct 28 to Nov 2 may fall in the gap between P2 and P3. |
| `china_additional_rate_total` | Must be entered. China tariffs (Section 301 plus any other China-specific duties) change often | USTR / CBP / a customs broker, per HTS code |
| `base_rate[hts_chapter]` | Enter per product from the HTS | hts.usitc.gov |
| `de_minimis_china` | Assume **no** duty-free de minimis for China-origin goods | CBP |
| `mpf_rate`, `mpf_min`, `mpf_max`, `hmf_rate` | about 0.3464%; min and max change every fiscal year; HMF 0.125% | CBP |
| `air_rate_per_kg`, `express_rate_per_kg`, `sea_rate_per_cbm` | Get real quotes from a freight forwarder | Freight forwarder quotes |
| `transit_days` | air 7–12, express 4–7, sea 30–45, customs 3–5 | Forwarder |
| `christmas_cutoff` | Dec 10 (goods landed in Utah) | Team decision |
| `fulfillment_per_order_cents`, `payment_fee_rate` | Enter your real numbers | Shopify Payments / 3PL |
| `est_cpa_default_cents` | 1500 | Update from real test results |
| `meta_min_daily_budget` | $10/day works on Meta for most objectives | Meta Ads Manager |
| `tiktok_min_budgets` | Last known: ad group about $20/day, campaign about $50/day | TikTok Ads Manager |
| `ftc_mail_order_rule` | Ship within the stated time, or within 30 days if no time is stated. Otherwise notify and offer a refund | ftc.gov |
