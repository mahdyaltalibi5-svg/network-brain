# LAUNCH: Summit Customs (summitcustomsuits.com)

Status: **build complete, all launch checks passing.** It is pending the client facts in `PLACEHOLDERS.md` before going live.
All numbers below were measured on the final build in this repository (branch `claude/relaxed-lovelace-jrt1qj`).

## Lighthouse (mobile)

### Lighthouse CI: default simulated throttling, 5 runs per URL, **median** run

| URL | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | **99** | **100** | **100** | **100** | 2.27 s | 0 | 64 ms |
| `/bespoke-suits` | **99** | **100** | **100** | **100** | 2.26 s | 0 | 50 ms |
| `/custom-wedding-suits-salt-lake-city` | **99** | **100** | **100** | **100** | 2.11 s | 0 | 57 ms |
| `/faq` | **99** | **100** | **100** | **100** | 2.11 s | 0 | 55 ms |

Targets: Performance ≥ 90 ✅ · SEO 100 ✅ · Accessibility ≥ 95 ✅ · Best Practices 100 ✅ · LCP < 2.5 s ✅ · CLS < 0.05 ✅ · INP < 200 ms ✅ (lab proxy: TBT 50–64 ms).
Reproduce with `npm run lhci` (`lighthouserc.cjs`, which asserts on the median run).

### Cross-check: applied (DevTools) throttling, 3 runs, median

| URL | Performance | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` | 92 | 1.70 s | 0.000 | 173 ms |
| `/bespoke-suits` | 97 | 1.61 s | 0.001 | 157 ms |
| `/custom-wedding-suits-salt-lake-city` | 97 | 1.62 s | 0.001 | 172 ms |
| `/faq` | 97 | 1.60 s | 0.015 | 156 ms |

Applied throttling really slows the network and CPU, so request ordering is realistic. It exposed a real font-swap layout shift (CLS 0.2 on slow connections) that the simulated runs could not see. That shift is fixed; see "What was optimised".

### Honest caveats
- **The homepage Lighthouse run exercises the SVG intro, not WebGL.** Headless Chrome here has no GPU (SwiftShader software rendering). detect-gpu rates that as low tier, which is exactly what it should do for such devices, so the 3D bundle never loads in these runs. Lighthouse is not special-cased: the tier logic is the same for every visitor.
- **The 3D path, measured separately** (`/?tier=high`, forced): Performance about 56, because under software GL every WebGL frame blocks the main thread (TBT in the minutes). Real GPUs render asynchronously. As a safety net, a **frame-budget guard** drops to the static scenes for the session on any device that can't hold the frame rate.
- **FPS:** the 55+ fps target can't be verified in this container. Mid tier renders at about 2 fps in software at 1440×900. The GPU-independent main-thread cost per frame is a median of 1.2 ms (p95 3.6 ms) against the 16.7 ms budget. **Please confirm on real devices** with `https://summitcustomsuits.com/?intro=force&fps=1`, on a recent iPhone, a mid-range Android and a laptop.
- Localhost serving makes the simulated LCP bimodal: about 2.1 s, or about 2.6 s when framework JS finishes downloading before first paint, which can't happen over a real network. Hence 5 runs and medians. Individual runs above 2.5 s do occur in the raw data (`.lighthouseci/`).

## What was optimised in Phase 4
- **Fonts:** self-hosted WOFF2 subsets of Cormorant Garamond (upright and italic) and Manrope (variable), 55 KB total versus about 100 KB from the default Google subsets (`npm run fonts`).
- **Per-platform metric-adjusted fallbacks:** generated `@font-face` rules (Times/Liberation/Tinos, Arial/Liberation/Arimo/Helvetica, plus Android's Noto Serif and Roboto, separately for italic) so the font swap shifts nothing. CLS on slow connections went from 0.20 to 0.001.
- **`content-visibility: auto`** on below-the-fold sections of inner pages: first layout went from about 15 ms to about 3 ms. Content stays in the DOM, so crawlers and assistive tech are unaffected.
- **Motion runtime (gsap, ScrollTrigger, Lenis) loads on first engagement**, keeping it out of first paint and TBT.
- **Hero ridge backdrop re-anchored** to the hero's top so font swaps can't move it.
- Measured and rejected: inlining CSS (worse FCP and TBT), disabling partial prefetching (no gain), not preloading fonts (CLS regression).

## SEO / GEO audit
- `npm run verify:html` (curl, no JavaScript) on all 15 sitemap URLs checks: exactly one H1, full body copy, every nav link, absolute canonical, OG/Twitter tags, **og:image resolves to a 1200×630 PNG**, JSON-LD present, unique titles and descriptions, 404 for unknown slugs. ✅
- `--compare` confirms every Phase 1 title, description, H1, summary and body sentence is still in the raw HTML after the 3D work. ✅
- `npm run verify:jsonld`: ClothingStore (LocalBusiness), Organization, WebSite, WebPage, Service ×4, FAQPage, BreadcrumbList, Article ×3, CollectionPage. All parse, have their required properties, and contain no dangling `@id`s. Placeholder facts are withheld from schema, and there's no AggregateRating without real reviews. ✅
- `sitemap.xml` (15 URLs, lastModified) · `robots.txt` explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-SearchBot, Google-Extended and Applebot-Extended · `llms.txt` and `llms-full.txt` (about 2,600 words) both flag placeholders as "do not quote". ✅
- Per-page OG images generated with `next/og` at build time (15 cards, all static). ✅

## Accessibility (WCAG 2.2 AA)
- `npm run contrast`: every text/background token pair passes. Lowest is stone on surface at 5.14:1; body copy on void is 11.4:1. ✅
- axe-core (wcag2a/aa, 2.1, 2.2) on all 15 routes: **0 violations.** ✅
- Keyboard: the skip link comes first, every focus stop has a visible ring, FAQ and the mobile menu are operable by keyboard, and the intro's Skip is the first Tab stop (Escape also skips). Focus returns to `<main>` after the intro. ✅
- Reduced motion: no WebGL, a 3 s SVG intro once per session, and static stand-ins for every 3D scene. Inactive process steps recede with AA-safe colours, never with opacity.

## Test suite (final run)
- `npm test`: **14/14 Playwright tests pass.** They cover the intro (skip by mouse and keyboard, session replay, reduced motion, low tier, intro off, full play-through, frame-budget guard), the keyboard walkthrough, the mobile menu, the route wipe, zero console errors across all routes, static fallbacks, and axe.
- Lint (0 warnings), TypeScript and build (all routes static) pass.

## Before go-live
1. Fill `PLACEHOLDERS.md` (NAP, hours, prices, founder, mills, reviews, social links) in `content/business.ts`, then run `npm run placeholders`.
2. Deploy on Vercel with Root Directory `summit-customs` (see `summit-customs/README.md`).
3. Check FPS on real devices with `?fps=1`, and run PageSpeed Insights against the live URL.
4. Submit the sitemap to Google Search Console and Bing, and verify the Google Business Profile with the same NAP as the site.
