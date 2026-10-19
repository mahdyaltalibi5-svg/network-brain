import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";

/** Shared Open Graph card (1200 × 630): void ground, gold ridgeline-to-lapel motif, display title. */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/** Cached so the build prerenders every card (file reads are otherwise request-time I/O under Cache Components). */
async function loadFonts() {
  "use cache";
  cacheLife("max");
  const read = async (f: string) => new Uint8Array(await readFile(join(process.cwd(), "app/fonts", f)));
  return Promise.all([read("og-cormorant-500.ttf"), read("og-cormorant-500-italic.ttf"), read("og-manrope-600.ttf")]);
}

export async function ogImage({ title, eyebrow }: { title: string; eyebrow: string }) {
  // exact byte range: after the cache round-trip each array may be a view into a larger buffer
  const [serif, serifItalic, sans] = (await loadFonts()).map((u) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer);
  const long = title.length > 60;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "radial-gradient(ellipse at 78% 40%, #1a1712 0%, #07080A 62%)",
          color: "#F2EDE4",
          fontFamily: "Manrope",
        }}
      >
        {/* ridgeline that becomes a lapel: the brand motif */}
        <svg width="420" height="420" viewBox="0 0 400 400" style={{ position: "absolute", right: 40, top: 110, opacity: 0.85 }}>
          <path d="M20,330 L70,282 L105,300 L150,222 L200,150 L236,214 L280,190 L330,266 L380,300" fill="none" stroke="#8A8579" strokeWidth="1.2" />
          <path d="M124,64 L146,124 L166,178 L184,236 L200,300 L216,236 L234,178 L254,124 L276,64" fill="none" stroke="#E2C27F" strokeWidth="2.2" />
          <circle cx="200" cy="330" r="5" fill="none" stroke="#C9A45C" strokeWidth="1.5" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="44" height="26" viewBox="0 0 40 24">
            <path d="M1 22 L12 6 L17 13 L21 2 L27 12 L30 9 L39 22" fill="none" stroke="#C9A45C" strokeWidth="1.6" />
          </svg>
          <div style={{ display: "flex", fontFamily: "Cormorant", fontSize: 30, letterSpacing: 7, textTransform: "uppercase" }}>
            Summit <span style={{ color: "#C9A45C", marginLeft: 12 }}>Customs</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div style={{ fontSize: 20, letterSpacing: 5, color: "#C9A45C", textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ marginTop: 22, fontFamily: "Cormorant", fontSize: long ? 64 : 82, lineHeight: 1.02, letterSpacing: -0.5 }}>{title}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 19, color: "#C9C3B8" }}>
          <div style={{ fontFamily: "Cormorant Italic", fontSize: 28, color: "#E2C27F" }}>Bespoke Suits &amp; Image Consulting · Salt Lake City</div>
          <div style={{ letterSpacing: 2 }}>summitcustomsuits.com</div>
        </div>
        <div style={{ position: "absolute", left: 72, right: 72, bottom: 128, height: 1, background: "linear-gradient(90deg, #C9A45C, rgba(201,164,92,0))" }} />
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Cormorant", data: serif, weight: 500, style: "normal" },
        { name: "Cormorant Italic", data: serifItalic, weight: 500, style: "normal" },
        { name: "Manrope", data: sans, weight: 600, style: "normal" },
      ],
    },
  );
}
