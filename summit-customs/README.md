# Summit Customs: summitcustomsuits.com

Bespoke suits & image consulting, Salt Lake City. A static, crawler-complete Next.js site with a fully procedural WebGL entrance ("The Ascent") and scroll scenes.

- **Stack:** Next.js 16 (App Router, TypeScript, every route static) · Tailwind CSS v4 · React Three Fiber, drei, postprocessing · GSAP + ScrollTrigger · Lenis · detect-gpu · Playwright · Lighthouse CI
- **Plan / status:** `../PLAN.md` · **Launch report:** `../LAUNCH.md` · **Facts still needed:** `../PLACEHOLDERS.md`
- **Conventions for contributors and AI sessions:** `../CLAUDE.md`

## Run locally

```bash
cd summit-customs
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production build (what Vercel serves)
```

Node 20+ is required. The 3D bundle loads only on the homepage, after first paint.

Useful URL switches on `/`:

| Param | Effect |
|---|---|
| `?intro=force` | play the full intro even if already seen this session |
| `?intro=off` | skip the intro (straight to the resting hero) |
| `?tier=high\|mid\|low` | force a GPU tier (`low` = SVG fallback) |
| `?t=5` | freeze the intro at 5 s (for reviewing frames) |
| `?fps=1` | on-screen frame-rate meter, for checking real hardware |

## Edit copy

All copy is in `content/` and is typed, so the build catches mistakes.

| What | Where |
|---|---|
| Business facts: name, address, phone, hours, prices, social links | `content/business.ts` (`business`, `studio`, `founder`) |
| Service summaries, titles and meta descriptions | `content/services.ts` |
| Long-form service page copy | `app/<service>/page.tsx` |
| FAQ (also feeds FAQPage schema and llms-full.txt) | `content/faq.ts` |
| Process steps, fabrics, anatomy, occasions | `content/process.ts`, `content/fabrics.ts`, `content/anatomy.ts`, `content/occasions.ts` |
| Journal posts | meta in `content/journal/posts.ts`; body in `content/journal/bodies/*.tsx`; register the body in `app/journal/[slug]/page.tsx` |
| Client reviews (turns on Review/AggregateRating schema) | `content/reviews.ts` |

Inline markup in copy strings: `[link text](/path)`, `**bold**`.

**Placeholders.** Anything the studio must confirm is written `ph("description")`. It renders as a visible `[PLACEHOLDER: …]` marker and is never published in JSON-LD. Replace the `ph(...)` call with the real value, then run `npm run placeholders` to regenerate `PLACEHOLDERS.md`.

If you add copy with new special characters (é, ñ…), run `npm run fonts`. The self-hosted fonts are subset to the characters the site uses, and this also regenerates the layout-shift-free fallback metrics.

## Swap the logo

1. `components/ui/Logo.tsx` contains the header/footer wordmark and mark (inline SVG). Replace `LogoMark` and the wordmark with the client's SVG.
2. Replace `public/logo.svg` (used in Organization/ClothingStore JSON-LD) and `app/icon.svg` (favicon).
3. OG cards draw the mark in `lib/og.tsx`. Update the small `<svg>` there.
4. The embroidered intro label is generated from type. To change the text, edit `TEXT` in `scripts/gen-label-paths.mjs` and run it (this writes `three/label/labelPaths.ts`).

## Tune the intro timing

**One file: `three/timeline/ascent.ts`.**

- `SHOTS` holds the beat boundaries in seconds (void 0 → thread 1.0 → mountain 2.5 → transform 4.2 → label 6.0 → entrance 7.2 → end 8.0). Every tween is positioned relative to these, so moving a boundary moves its whole shot.
- `MICRO` is the 1.5 s return-visit version.
- Each shot's section in `buildAscent()` sets the camera moves, morph durations, audio cues and label timing.
- Review changes with `npm run intro:frames -- screenshots/intro --times=0.5,2,3.5,5,6.5,7.8` or by visiting `/?intro=force&t=<seconds>`.

Related files: shaders `three/scene/shaders.ts` · scene, camera and lifecycle `three/Experience.tsx` · procedural shapes `three/targets/` (heightfield, jacket from `lib/jacket.ts`, thread, scroll-scene targets) · tiers `three/config.ts` · reduced-motion SVG version `components/intro/IntroFallback.tsx` · sound design `three/audio/sfx.ts`.

## Deploy to Vercel

1. Import the GitHub repository in Vercel.
2. **Root Directory:** `summit-customs`. The framework preset is detected (Next.js). The build command `npm run build` copies the GPU benchmarks automatically via `prebuild`.
3. Add the domain `summitcustomsuits.com` (and `www`, redirecting to the apex). The canonical URL is set in `content/business.ts` (`SITE_URL`).
4. After the first deploy, submit `https://summitcustomsuits.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools, and verify the Google Business Profile.

## Quality checks

```bash
npm run lint && npm run typecheck
npm run build
npm run verify:html        # curls every route; asserts H1, copy, nav, canonical, OG image and JSON-LD without JS
npm run verify:jsonld      # parses and validates all structured data
npm test                   # Playwright: intro, keyboard walkthrough, route wipe, axe WCAG 2.2 AA, console errors
npm run contrast           # WCAG 2.2 AA contrast of every colour pair
npm run lhci               # Lighthouse CI (mobile, 3 runs, median assertions)
npm run check:phase4       # everything above
```

Headless Chromium in CI has no GPU, so it renders WebGL in software. Visual frame checks there are valid, but frame rates are not. Use `/?fps=1` on real devices.
