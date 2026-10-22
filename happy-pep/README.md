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

## Environment variables

- `NEXT_PUBLIC_TIKTOK_PIXEL_ID`: turns on the TikTok Pixel (ViewContent, AddToCart, InitiateCheckout, CompletePayment).
- `NEXT_PUBLIC_SITE_URL`: your live domain, used for social share images.
