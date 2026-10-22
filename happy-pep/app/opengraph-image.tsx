import { ImageResponse } from "next/og";

export const alt = "Happy Pep: same-day in Utah, 5 days everywhere else, free BAC water with every order.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fredoka() {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Fredoka:wght@600")).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

// Share preview for TikTok bios, texts and social links.
export default async function OpengraphImage() {
  const font = await fredoka();
  const display = font ? "Fredoka" : "sans-serif";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#0125C4", padding: "0 80px", gap: 70, fontFamily: display }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "white", fontSize: 150, lineHeight: 0.82, fontWeight: 600 }}>
          <span>happy</span>
          <span>pep</span>
          <svg width="240" height="76" viewBox="0 0 100 32" style={{ marginTop: 10 }}>
            <path d="M7 7 Q50 36 93 7" stroke="#3EF5B9" strokeWidth="11" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", color: "white", fontWeight: 600 }}>
          <div style={{ fontSize: 58, lineHeight: 1.05 }}>Same-day in Utah.</div>
          <div style={{ fontSize: 58, lineHeight: 1.05, color: "#3EF5B9" }}>5 days everywhere</div>
          <div style={{ fontSize: 58, lineHeight: 1.05, color: "#3EF5B9" }}>else.</div>
          <div style={{ marginTop: 34, display: "flex", fontSize: 28, color: "#0125C4", background: "#3EF5B9", borderRadius: 999, padding: "14px 28px", alignSelf: "flex-start" }}>
            Free BAC water with every order
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Fredoka", data: font, weight: 600, style: "normal" }] : [] },
  );
}
