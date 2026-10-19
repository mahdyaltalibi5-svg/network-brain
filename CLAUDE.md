# CLAUDE.md — Summit Customs website

The Summit Customs site (summitcustomsuits.com) lives in `summit-customs/`. The root `index.html` is an unrelated "Network Brain" page; don't touch it.
Plan: `PLAN.md`. Client-supplied facts still missing: `PLACEHOLDERS.md`.

## Stack
- Next.js App Router + TypeScript. **Every route must be static** (`○`/`●` in the build output, never `ƒ`).
- Tailwind CSS, with all design tokens as CSS variables in `app/globals.css`
- React Three Fiber + drei + @react-three/postprocessing (homepage only, dynamically imported)
- GSAP + ScrollTrigger, Lenis · detect-gpu (benchmarks self-hosted in `public/`)
- Playwright (tests and screenshots) · Lighthouse CI · Deploy: Vercel (Root Directory `summit-customs`)

## Brand tokens
| Token | Hex | Use |
|---|---|---|
| `--void` | #07080A | page background |
| `--ivory` | #F2EDE4 | primary text |
| `--gold` | #C9A45C | accents, rules, CTAs, the thread |
| `--charcoal` | #2A2B2E | surfaces/cards (charcoal wool) |
| `--stone` | #8A8579 | secondary text (check contrast) |

- Display: Cormorant Garamond (editorial, high contrast). Body: Manrope. Both via `next/font`.
- Mood: Savile Row precision meets Wasatch scale. Motion is fast, then dead still. Luxury = control: restraint, whitespace, hairline gold rules.

## Rules
- **Never fabricate business facts.** Use `ph("description")` → renders `[PLACEHOLDER: description]`. Then run `npm run placeholders` to regenerate `PLACEHOLDERS.md`.
- All business facts come from `content/business.ts` (single source for pages, JSON-LD, llms.txt and the sitemap).
- Content first: every page must be complete in the raw HTML without JS (H1, copy, nav, JSON-LD). Exactly one H1 per page.
- Service pages open with a 2–3 sentence answer-first summary.
- No `AggregateRating`/`Review` schema unless `content/reviews.ts` has real reviews.
- 3D is 100% procedural (code-generated geometry, shaders, SVG-sampled points). No .glb models or paid assets.
- 3D never gates content. It needs a reduced-motion/low-tier fallback, an `aria-hidden` canvas and a keyboard-reachable Skip.
- Intro timing lives in **one file**: `summit-customs/three/timeline/ascent.ts`.
- Images: explicit width/height and meaningful alt text.
- Commit after each phase. Run the phase checks first and don't skip a failing check.

## Next.js 16 notes
- Read `summit-customs/node_modules/next/dist/docs/` before using unfamiliar APIs (see `summit-customs/AGENTS.md`).
- Cache Components is on. Static output is enforced by `export const ensureStatic = "navigation"` in `app/layout.tsx`. Don't use `new Date()`, `cookies()` or `headers()` in server components.
- `dynamicParams` isn't available. Unknown journal slugs call `notFound()`.

## The Ascent (homepage intro)
- Timing: `summit-customs/three/timeline/ascent.ts` (SHOTS table). Shaders: `three/scene/shaders.ts`. Scene/camera/lifecycle: `three/Experience.tsx`.
- Boot: `lib/intro-boot.ts` (inline in `<head>`, picks full/micro/fallback before paint). Veil + controls: `components/intro/IntroVeil.tsx`. Lazy loader + tier: `components/intro/IntroController.tsx`.
- Procedural targets: `three/targets/*` (heightfield, jacket from `lib/jacket.ts`, thread), built in a Web Worker.
- Label outlines are generated: `node scripts/gen-label-paths.mjs` → `three/label/labelPaths.ts`.
- Debug URL params: `?intro=force|off`, `?tier=high|mid|low`, `?t=<seconds>` (pause at a time), `?fps=1` (meter).
- One canvas: the intro overlay (z 55) becomes the page background (z -1). `body` must stay transparent.

## Content map
- Facts: `content/business.ts` (`business`, `studio`, `founder`) · services: `content/services.ts` · FAQ: `content/faq.ts`
- Journal: `content/journal/posts.ts` (meta) + `content/journal/bodies/*.tsx` (body), registered in `app/journal/[slug]/page.tsx`
- Inline copy markup via `rich()`: `[label](/href)`, `**bold**`, placeholders

## Commands (run in `summit-customs/`)
- `npm run check:phase1`: lint + types + build + verify:html + verify:jsonld + screenshots
- `npm run check:phase2`: Phase 1 checks + raw-HTML compare + Playwright intro tests + intro frame captures
- `npm run intro:frames -- <dir> --tier=high --w=1440 --h=900 --times=0.5,2` · `npm run intro:fps -- --tier=mid`
- `npm run dev` · `npm run build` · `npm start`
- `npm run verify:html`: curl every route and assert content/JSON-LD without JS (`-- --compare` diffs against the Phase 1 snapshot)
- `npm run verify:jsonld`: parse and validate all JSON-LD
- `npm run shots`: Playwright screenshots (390 / 1440)
- `npm test`: Playwright tests · `npm run lhci`: Lighthouse CI
- `npm run placeholders`: regenerate PLACEHOLDERS.md
- Chromium: `/opt/pw-browsers` (never run `playwright install`)
