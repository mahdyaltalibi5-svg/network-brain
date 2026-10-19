import { LABEL_VIEWBOX, labelGlyphs } from "@/three/label/labelPaths";
import { IntroController } from "./IntroController";
import { IntroFallback } from "./IntroFallback";

/**
 * The intro overlay. Server-rendered but hidden (display: none) unless the
 * boot script marked <html class="intro-on">, so crawlers and no-JS visitors
 * get the normal page. Layers: void backdrop (z 50) → WebGL canvas (z 55,
 * client) → UI: label, tagline, controls (z 60).
 */
export function IntroVeil() {
  return (
    <>
      <div className="intro-veil intro-bg" data-intro-layer aria-hidden="true">
        <span className="intro-point" />
        <IntroFallback />
      </div>

      <div className="intro-veil intro-ui" data-intro-layer>
        <div data-intro-label className="intro-label" aria-hidden="true">
          <svg viewBox={LABEL_VIEWBOX} className="w-[min(84vw,880px)] overflow-visible">
            <defs>
              <mask id="label-draw" maskUnits="userSpaceOnUse">
                {labelGlyphs.map((g, i) => (
                  <path key={i} data-glyph d={g.d} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
                ))}
              </mask>
            </defs>
            {/* running stitch, revealed stitch by stitch as the mask draws on */}
            <g mask="url(#label-draw)" fill="none" stroke="#F0D59A" strokeWidth="2.1" strokeDasharray="3.4 2.2" strokeLinecap="round">
              {labelGlyphs.map((g, i) => (
                <path key={i} d={g.d} />
              ))}
            </g>
          </svg>
        </div>
        <p data-intro-tagline className="intro-tagline">
          Bespoke Suits &amp; Image Consulting · Salt Lake City
        </p>

        <div className="intro-controls">
          <div className="flex items-center gap-3">
            <button type="button" data-intro-sound aria-pressed="false" className="intro-btn">
              <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M2 6h3l4-3v10l-4-3H2z" />
                <path d="M11.5 5.5a3.5 3.5 0 0 1 0 5" />
              </svg>
              <span>Sound off</span>
            </button>
            <button type="button" data-intro-tilt hidden className="intro-btn">
              <span>Enable tilt</span>
            </button>
          </div>
          <button type="button" data-intro-skip className="intro-btn intro-skip">
            <span>Skip intro</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      {/* outside the veil: the canvas must outlive it and later sit behind the page */}
      <IntroController />
    </>
  );
}
