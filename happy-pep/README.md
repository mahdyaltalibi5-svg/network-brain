# Happy Pep

Mobile-first storefront for Happy Pep, built for TikTok ad traffic: a 21+ entrance gate, a same-day Utah / 5-day USA offer, a simple store with free BAC water on every order, and smooth Framer Motion + Lenis animations.

**TikTok ads → `/shop`** (age gate, then straight into the products). Local search pages live at `/utah/<city>`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Before launch, edit

| What | Where |
|---|---|
| Products, sizes, prices, badges, lot numbers, COA details | `lib/products.ts` |
| Contact email, same-day zones + ZIP prefixes, cutoff hour, free-shipping minimum, stack discounts, founder block, email signup URL | `lib/site.ts` |
| Same-day city pages | `lib/cities.ts` |
| Real customer reviews (section hides while empty) | `lib/reviews.ts` |
| Payment processor (checkout errors until connected) | `lib/checkout.ts` |
| Terms / Privacy / Refunds copy (templates, get a legal review) | `app/terms`, `app/privacy`, `app/refunds` |

## Admin dashboard

`/admin` shows revenue, orders, where orders ship, top products, traffic source and a fulfillment queue, plus a searchable orders list with status updates and CSV export.

1. Vercel → happy-pep → Storage → create a **Neon (Postgres)** database and connect it. This sets `DATABASE_URL`; the `orders` table is created automatically.
2. Vercel → Settings → Environment Variables → add `ADMIN_PASSWORD` (long and unique).
3. Redeploy, then sign in at `/admin`.

Every checkout is saved as **Awaiting payment**. Once a payment processor is connected (`lib/checkout.ts`), its webhook should call `markPaid()` from `lib/orders.ts`; until then you can mark orders paid by hand.

## Environment variables

- `DATABASE_URL`: Postgres connection string (orders + dashboard).
- `ADMIN_PASSWORD`: password for `/admin`. Optional `ADMIN_SESSION_SECRET` signs login sessions (defaults to the password).

- `NEXT_PUBLIC_TIKTOK_PIXEL_ID`: turns on the TikTok Pixel (ViewContent, AddToCart, InitiateCheckout, CompletePayment).
- `NEXT_PUBLIC_SITE_URL`: your live domain, used for social share images.
