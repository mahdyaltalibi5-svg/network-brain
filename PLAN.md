# Summit Customs — Build Plan

Status: **Approved.** Phase 1 complete ✅ · Phase 2 in progress

Site: summitcustomsuits.com · Bespoke suits & image consulting · Salt Lake City, UT
Goal: a static, crawler-complete luxury site with a fully procedural 3D entrance ("The Ascent"), plus best-in-class SEO and GEO (visibility in AI search).

---

## 0. Decisions & assumptions (please confirm)

| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | **Location in repo.** This repo already holds an unrelated `index.html` ("Network Brain"). | Build the Next.js app in **`summit-customs/`**. The existing file stays untouched. Vercel "Root Directory" = `summit-customs`. |
| D2 | **Rendering mode.** | Default Next.js output (not `output: 'export'`) so `next/og` and Vercel image optimization work, but **every route must show as `○ Static` or `● SSG`** in the build log. CI fails if any route is dynamic (`ƒ`). |
| D3 | **Fonts.** | **Cormorant Garamond** (display, 500/600, italic 500) + **Manrope** (body, 400/500/600), self-hosted by `next/font/google` at build time. No runtime calls to Google. |
| D4 | **Booking & contact forms.** The site is static and there's no backend yet. | `/book` links to `[PLACEHOLDER: booking provider URL, e.g. Calendly/Acuity]` and has a fallback `mailto:` form. `/contact` shows NAP, a map link and a `mailto:`/`tel:` form. No fake submission endpoint. |
| D5 | **One WebGL canvas for the whole homepage.** | The intro canvas *becomes* the resting hero jacket, which then drives the scroll scenes in Phase 3. That means one GL context, one particle buffer and one master clock. Inner pages ship **zero** 3D JavaScript. |
| D6 | **Prices.** | All prices are placeholders, e.g. `[PLACEHOLDER: bespoke two-piece starting price]`. `priceRange` in JSON-LD is also a placeholder until you supply it. |
| D7 | **Reviews.** | The testimonials section renders placeholder cards that are visibly marked. **No `AggregateRating` and no `Review` schema** until real reviews arrive. A single flag in `content/reviews.ts` switches them on. |

---

## Architecture overview

```
summit-customs/
  app/                      # App Router, one folder per route, all SSG
    (site)/…                # pages
    journal/[slug]/         # generateStaticParams over content/journal
    sitemap.ts robots.ts    # metadata routes
    llms.txt/route.ts       # static route handlers (force-static)
    llms-full.txt/route.ts
    opengraph-image.tsx     # + per-route OG images (next/og)
  content/                  # ALL copy & business facts live here (typed TS)
    business.ts             # NAP, hours, geo, sameAs, founder: single source of truth
    services.ts faq.ts fabrics.ts process.ts journal/*.ts reviews.ts
  lib/seo/                  # metadata builder + JSON-LD builders (pure functions)
  components/               # server components by default
    ui/ sections/ layout/
  three/                    # client-only, dynamically imported, homepage only
    timeline/ascent.ts      # ← THE master GSAP timeline (intro timing lives here)
    particles/              # shared Points geometry + morph shader
    targets/                # procedural generators: heightfield, jacket SVG, process path, anatomy layers, fabric swatches
    post/                   # bloom / CA / grain / vignette config per tier
    audio/                  # Web Audio synthesized cues
    fallback/               # SVG "ridgeline → lapel" intro
  scripts/                  # verify-html.mjs, validate-jsonld.mjs, screenshots, fps, contrast, gen-label-paths.mjs
  tests/                    # Playwright specs
```

Key principles:
- **Content first.** Every page is complete, semantic HTML from the server. JavaScript only adds motion on top.
- **Business facts live in `content/business.ts` only.** Pages, JSON-LD, llms.txt and the sitemap all read from it, so a fact changes in one place.
- **Placeholders are typed.** A `ph("description")` helper renders `[PLACEHOLDER: description]` and records the key. `scripts/list-placeholders.mjs` regenerates `PLACEHOLDERS.md` so the list never drifts.

---

## PHASE 1 — Foundation + content-first site (no 3D)

### 1.1 Scaffold
- [x] `create-next-app` (TypeScript, App Router, Tailwind, ESLint) in `summit-customs/`
- [x] Tailwind wired to CSS variables: `--void #07080A`, `--ivory #F2EDE4`, `--gold #C9A45C`, `--charcoal #2A2B2E`, `--stone #8A8579`, plus a type scale, spacing and easing tokens
- [x] `next/font` setup (D3), base layout, skip-to-content link, focus styles
- [x] `CLAUDE.md`, `PLACEHOLDERS.md`, npm scripts: `build`, `verify:html`, `verify:jsonld`, `shots`, `test`, `lhci`

### 1.2 Design system (server components)
- [x] Header with primary nav (all 12 routes reachable within 2 clicks), mobile menu that works without JS (`<details>`), footer with full NAP, hours, service area and secondary links
- [x] Primitives: `Section`, `Eyebrow`, `DisplayHeading`, `Prose`, `Button`/`LinkButton`, `FactList` (quotable key–value facts), `Breadcrumbs`, `FAQAccordion` (native `<details>`), `CTA`, `Figure` (explicit width/height; placeholder art is generated SVG, not stock photos)
- [x] Editorial grid: generous whitespace, hairline gold rules, small-caps eyebrows. Restraint is the luxury signal.

### 1.3 Content (`content/*`): real, specific, premium copy
- [x] **Homepage:** Hero · The Process (Consultation → Measurements → Fabric → Construction → Final Fitting) · Anatomy of the Suit · Image Consulting · Occasions (Business / Wedding / Executive) · Testimonials · FAQ · Final CTA "Book a Private Fitting" with NAP
- [x] **Service pages:** `/bespoke-suits`, `/custom-wedding-suits-salt-lake-city`, `/image-consulting`, `/executive-wardrobe`. Each opens with a 2–3 sentence answer-first summary ("Summit Customs is a Salt Lake City bespoke tailor that…"), followed by: who it's for, what's included, timeline, construction facts, pricing (placeholder), FAQs, related links and a CTA
- [x] `/fabrics` (weights, compositions, seasons for Utah's dry climate and altitude; mills = placeholders) · `/process` (step-by-step with durations and fitting count) · `/about` (visible founder bio with credentials, all placeholders: name, training, years, photo) · `/faq` · `/book` · `/contact`
- [x] **Journal:** `/journal` index plus the 3 starter articles (≈1,200–1,800 words each, with author byline, published/updated dates, table of contents and internal links)
- [x] Construction facts are written as general tailoring knowledge (full vs half canvas, hand-padded lapels, working cuffs, typical 6–10 week bespoke timeline, typical 3 fittings). Any claim specific to *Summit's* own numbers is marked `[PLACEHOLDER: confirm]`.

### 1.4 SEO
- [x] `lib/seo/metadata.ts`: unique title, description, canonical, OG and Twitter tags per route; exactly one H1 per page
- [x] JSON-LD builders: `ClothingStore` (with `LocalBusiness` traits: NAP, geo, openingHours, priceRange, areaServed = Salt Lake City, Park City, Provo, Ogden, Sandy, Draper), `Organization` + `sameAs`, `Service` per service page, `FAQPage`, `BreadcrumbList`, `Article` on posts, `WebSite`. `AggregateRating` is gated (D7). Entities are linked by `@id`.
- [x] `sitemap.ts` (with lastModified), `robots.ts`, descriptive anchor text, alt text everywhere, explicit image dimensions
- [x] Keyword map: one primary keyword per page (bespoke suits SLC → `/bespoke-suits`, custom wedding suits Utah → wedding page, image consultant SLC → `/image-consulting`, executive wardrobe consultant → `/executive-wardrobe`, custom/made-to-measure suits SLC/Utah → home + journal #1)

### 1.5 GEO (AI search visibility)
- [x] `robots.txt` explicitly allows `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended` (plus `*`)
- [x] `/llms.txt` (concise index) and `/llms-full.txt` (full fact sheet: business, services, area, process, pricing range, timelines, key URLs), both generated from `content/*` at build time
- [x] FAQ written as the questions people actually ask AI: custom suit cost in Salt Lake City; bespoke vs made-to-measure; how long a custom suit takes; what to wear to a Utah wedding (temple sealing/reception, outdoor mountain venues); what an image consultant does; and similar
- [x] Quotable, fact-dense formatting: short declarative sentences, `<dl>` fact lists, comparison table (bespoke vs MTM vs off-the-rack)

### Phase 1 checks (all must pass before Phase 2)
1. `npm run build`: zero errors, zero type errors (`tsc --noEmit` + `next lint`), and every route is static
2. `scripts/verify-html.mjs`: starts `next start`, `curl`s **every** route (no JS) and asserts exactly one `<h1>`, body copy above a minimum word count, all nav links, `<link rel=canonical>`, OG tags and ≥1 `application/ld+json` block
3. `scripts/validate-jsonld.mjs`: parses every JSON-LD block, checks required properties per `@type`, checks for no dangling `@id` references, and confirms no `AggregateRating` without reviews
4. Playwright: screenshot every page at 390px and 1440px → review each one → fix layout issues → re-shoot
5. Commit: `Phase 1: content-first static site with SEO + GEO`

**Phase 1 result:** all checks pass via `npm run check:phase1`. Lint, types and build are clean, and all 15 routes are static. Every page has its H1, copy, nav and JSON-LD in the raw HTML. JSON-LD is valid, with placeholder facts withheld. No overflow or console errors at 390px or 1440px.
Note: Next.js 16 uses Cache Components, so static output is enforced with `ensureStatic = "navigation"` on the root layout rather than `dynamic = 'force-static'`. The `◐ /journal/[slug]` row in the build output is only the fallback shell for unknown slugs, which return 404. Article JSON-LD points at per-post OG images that arrive in Phase 4.

---

## PHASE 2 — "The Ascent" entrance (fully procedural)

### 2.1 Loading strategy (protects LCP and CLS)
- [ ] The homepage hero is pure HTML/CSS (H1 + tagline + CTA) and is the LCP element
- [ ] A tiny client `IntroGate` (<3 KB) decides the mode: first visit → full intro; `sessionStorage` flag → 1.5s micro-version; `prefers-reduced-motion`, low tier or no WebGL → 3s SVG fallback
- [ ] The 3D bundle is loaded with `import()` only after `load` + `requestIdleCallback`. The overlay is `position: fixed`, takes no layout space (CLS stays 0) and shows a void-colored veil until the first GL frame
- [ ] `detect-gpu` benchmark data is **self-hosted** under `/public/gpu-benchmarks` (no third-party fetch)
- [ ] Tiers: **High** = 40k particles, full post, DPR ≤ 2 · **Mid** = 15k, bloom only, DPR 1.5 · **Low / no-WebGL / reduced-motion** = SVG fallback

### 2.2 Procedural assets (all generated in code; no .glb and no paid assets)
- [ ] `targets/heightfield.ts`: layered simplex + ridged noise multiplied by a north–south ridge mask (Wasatch-like front with one dominant summit). Points are sampled by rejection on slope and height.
- [ ] `targets/jacket.ts`: a hand-authored SVG path of a bespoke jacket front (shoulders, notch lapels, two-button stance, flap pockets, breast welt). Points are sampled along strokes and inside the fill, then given depth on a curved torso (cylindrical bend + chest swell). The ridgeline points are deliberately mapped onto the lapel edge.
- [ ] `scripts/gen-label-paths.mjs`: converts "SUMMIT CUSTOMS" to stroke paths with opentype.js at build time, then commits a generated TS file
- [ ] Thread: CatmullRom curve with stitch dips through an invisible plane → `TubeGeometry` with a growing draw range + additive trail; spark bursts at each stitch hole

### 2.3 Particle system (shared with Phase 3)
- [ ] One `THREE.Points` + custom `ShaderMaterial`. Attributes: `aMountain`, `aJacket`, `aRandom`, `aDelay`, `aColorMix`. Uniforms: `uMorph`, `uSwirl`, `uBurst`, `uTime`, `uMouse`.
- [ ] Vertex shader: per-particle staggered `smoothstep` delay plus a **curl-noise** offset that peaks mid-flight (reads as weaving, not crossfading); fiber shimmer; mouse repulsion ripple
- [ ] Fragment shader: soft disc, gold/ivory mix, brighter gold channel for selective bloom

### 2.4 Master timeline: `three/timeline/ascent.ts` (single source of intro timing)
| Time | Shot | Key work |
|------|------|----------|
| 0.0–1.0 | VOID | grain shader, single gold point, one heartbeat pulse |
| 1.0–2.5 | THREAD | needle tip runs the curve, stitch sparks, chase camera + handheld noise |
| 2.5–4.2 | MOUNTAIN | thread unravels → particles settle onto the heightfield, fog plane, cool rim light, low sweep to the summit |
| 4.2–6.0 | TRANSFORMATION | whip-around, mountain → jacket morph with curl swirl, gold pick-stitch line traces the lapel |
| 6.0–7.2 | LABEL | push in to the chest, "SUMMIT CUSTOMS" embroiders itself (dash-offset stitch draw), HTML tagline fades in |
| 7.2–8.0 | ENTRANCE | outward burst past the camera, canvas fades → resting interactive hero jacket |
- [ ] Fast-forward: scroll, click or keypress sets `timeline.timeScale(3)` (no jump cut). The **Skip intro** button (bottom-right, focused first, visible from frame 0) tweens to the end in 400ms.
- [ ] Micro-version (return visit): 1.5s mountain → jacket morph only
- [ ] Interaction: mouse parallax on camera and key light; optional gyroscope after a permission tap on iOS
- [ ] Post-processing: selective bloom (gold luminance threshold), chromatic aberration driven by camera velocity, film grain, vignette
- [ ] Sound toggle (bottom-left, off by default). All cues are synthesized with the Web Audio API: hum → stitch clicks → wind (filtered noise) → whoosh → shears snip
- [ ] Lifecycle: pause on `visibilitychange`; after the intro, dispose thread/label/post resources and keep only the particle buffer for the hero
- [ ] A11y: canvas `aria-hidden`, `aria-live="polite"` region ("Intro playing — press Escape or Skip to continue" → "Intro finished"), Escape skips, visible focus ring
- [ ] Resting hero: lower particle energy, slow rotation toward the cursor, ripple-away from the mouse; idle frame-rate cap when nothing moves

### 2.5 SVG fallback (3s)
- [ ] Gold stroke draws the ridgeline → path-morphs into the lapel line → logo fades in. Pure SVG + CSS/WAAPI, no WebGL.

### Phase 2 checks
1. Build passes (and every route is still static)
2. Playwright frame capture at 0.5s, 2s, 3.5s, 5s, 6.5s, 7.8s and the final hero (timeline driven deterministically via a `?t=` debug hook that is stripped from production). **Critical review of each frame**; improve and re-capture any that look generic, flat or empty.
3. Tests: Skip (mouse + keyboard) ends the intro; `sessionStorage` replay → micro-version; `reducedMotion: 'reduce'` → SVG fallback; a forced no-WebGL mode → SVG fallback
4. FPS: headless run forced to the mid tier, measured with `requestAnimationFrame` deltas over the intro; target ≥55. *Caveat: headless Chromium here renders WebGL in software (SwiftShader), so I'll report the measured number honestly and also add an in-page FPS meter (`?fps=1`) for you to confirm on real hardware.*
5. `verify-html.mjs` diffed against the Phase 1 snapshot: raw HTML content unchanged
6. Commit: `Phase 2: The Ascent procedural intro`

---

## PHASE 3 — Scroll experience + polish

- [ ] The persistent particle jacket morphs via ScrollTrigger-scrubbed uniforms (new target attributes generated once, lazily):
  - **Process:** particles regroup into a switchback mountain path with 5 glowing "camps" (one per step); the active camp syncs with the pinned step copy
  - **Anatomy:** exploded layers (canvas, lining, lapel, buttons, pockets), with labels as HTML elements projected from 3D anchor points (they stay real text, so they remain crawlable and accessible)
  - **Fabric:** particle swatches with a cloth-ripple vertex wave; HTML fabric cards (`[PLACEHOLDER: mills]`)
- [ ] Lenis smooth scroll synced to the GSAP ticker; ScrollTrigger pinning (pinning disabled under reduced motion)
- [ ] Magnetic CTA buttons; custom cursor (only with `pointer: fine`; hidden for touch and reduced motion)
- [ ] Page transitions: gold thread wipe between routes (client overlay keyed on pathname; uses the View Transitions API when available)
- [ ] Low-tier and reduced-motion users get static, designed SVG illustrations for every 3D scene

### Phase 3 checks
1. Build passes
2. Playwright screenshots of every homepage section at 390px and 1440px, reviewed and fixed
3. Keyboard-only walkthrough test: tab order, visible focus, skip link, menu, FAQ, CTAs, intro skip
4. Zero console errors or warnings across all routes (Playwright listener)
5. Commit: `Phase 3: scroll-driven 3D scenes, transitions, polish`

---

## PHASE 4 — Performance, SEO audit, launch prep

- [ ] Lighthouse CI (mobile preset, 3 runs, median) on `/`, `/bespoke-suits`, `/custom-wedding-suits-salt-lake-city`, `/faq`, using the pre-installed Chromium
- [ ] Targets: Performance ≥90, SEO 100, Accessibility ≥95, Best Practices 100; LCP <2.5s, CLS <0.05, INP <200ms (TBT used as the lab proxy for INP)
- [ ] Iterate: bundle analysis, chunk splitting, font subsetting, shader warm-up off the critical path, image formats
- [ ] Per-page OG images with `next/og` (void background, gold rule, display serif title)
- [ ] Audit: sitemap, robots.txt, llms.txt, canonicals (absolute, no duplicates), hreflang not needed (en-US only)
- [ ] WCAG 2.2 AA contrast script over every token pair used on the void/charcoal backgrounds. *Note: stone `#8A8579` on void is roughly 5.2:1, which passes for body text; gold on void is roughly 8:1. I'll verify the exact values in the script.*
- [ ] `README.md`: run locally, edit copy (`content/`), swap the logo, tune intro timing (`three/timeline/ascent.ts`), deploy to Vercel
- [ ] `LAUNCH.md` with the final scores; final `PLACEHOLDERS.md`
- [ ] Commit: `Phase 4: performance, audit, launch docs`

---

## Risks & mitigations
- **The 3D bundle hurting mobile Performance/TBT:** it is loaded after `load` + idle, split into chunks, and the GPU tier is detected before the heavy chunk is fetched. If Lighthouse still drops below 90, the next lever is to start the intro on first user interaction or after a short delay on mobile. **I won't special-case Lighthouse user agents**; that would be gaming the score.
- **Headless WebGL fidelity:** software GL in this container may render slower and look softer than real GPUs. Frame reviews will judge composition, color and density; FPS is reported with that caveat.
- **Copy accuracy:** no invented facts. Anything business-specific becomes a placeholder.

## Open questions for you
1. Approve **D1–D7** above (especially the `summit-customs/` subfolder)?
2. Do you have a booking provider (Calendly, Acuity, Square)? If not, I'll ship the `mailto:` flow.
3. Should the journal show a named author (the founder), or "Summit Customs Studio" until a bio is supplied?
