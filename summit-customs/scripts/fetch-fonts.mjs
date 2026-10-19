/**
 * Downloads subsetted WOFF2 files (only the characters the site uses) from the
 * Google Fonts CSS API's `text=` subsetting, for self-hosting via next/font/local.
 * Both families are SIL Open Font License. Re-run if copy adds new characters:
 *   node scripts/fetch-fonts.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// every character used in source copy, plus the full printable ASCII range
const chars = new Set();
for (let c = 32; c < 127; c++) chars.add(String.fromCharCode(c));
const walk = (d) => readdirSync(d).forEach((f) => {
  const p = join(d, f);
  if (statSync(p).isDirectory()) walk(p);
  else if (/\.(tsx?|css)$/.test(f)) for (const ch of readFileSync(p, "utf8")) if (ch.charCodeAt(0) > 127 && ch.charCodeAt(0) < 0x2190) chars.add(ch);
});
["app", "components", "content", "lib"].forEach(walk);
["’", "‘", "“", "”", "—", "–", "·", "…", "é", "¾", "½", "¼", "×", "°", "©", "→"].forEach((c) => chars.add(c));
const text = encodeURIComponent([...chars].sort().join(""));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const faces = [
  ["cormorant-500.woff2", "Cormorant+Garamond:wght@500"],
  ["cormorant-500-italic.woff2", "Cormorant+Garamond:ital,wght@1,500"],
  ["manrope-var.woff2", "Manrope:wght@400..600"],
];
for (const [file, family] of faces) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${text}&display=swap`, { headers: { "User-Agent": UA } })).text();
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error(`no font url for ${family}:\n${css}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(`app/fonts/${file}`, buf);
  console.log(`${file}: ${(buf.length / 1024).toFixed(1)} KB`);
}
// TTF subsets for OG images: satori (next/og) reads TTF/WOFF, not WOFF2
const OLD_UA = "Mozilla/5.0 (Windows NT 6.1)";
for (const [file, family] of [["og-cormorant-500.ttf", "Cormorant+Garamond:wght@500"], ["og-cormorant-500-italic.ttf", "Cormorant+Garamond:ital,wght@1,500"], ["og-manrope-600.ttf", "Manrope:wght@600"]]) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${text}`, { headers: { "User-Agent": OLD_UA } })).text();
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(`app/fonts/${file}`, buf);
  console.log(`${file}: ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log(`${chars.size} characters`);
