# Happy Pep

Mobile-first storefront for Happy Pep, built for TikTok ad traffic: a 21+ entrance gate, a same-day Utah / 5-day USA offer, a simple store with free BAC water on every order, and smooth Framer Motion + Lenis animations.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Before launch, edit

| What | Where |
|---|---|
| Products, sizes, prices, lot numbers, COA links | `lib/products.ts` |
| Contact email, same-day delivery zones, cutoff hour | `lib/site.ts` |
| Real customer reviews (section hides while empty) | `lib/reviews.ts` |
| Payment processor (checkout errors until connected) | `lib/checkout.ts` |
| Terms / Privacy / Refunds copy (templates, get a legal review) | `app/terms`, `app/privacy`, `app/refunds` |

## Environment variables

- `NEXT_PUBLIC_TIKTOK_PIXEL_ID`: turns on the TikTok Pixel (ViewContent, AddToCart, InitiateCheckout, CompletePayment).
- `NEXT_PUBLIC_SITE_URL`: your live domain, used for social share images.
