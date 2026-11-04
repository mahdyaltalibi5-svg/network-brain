/**
 * Monogram letterforms for the film's cuff chapter: A–Z in Cormorant Garamond Italic 600,
 * as SVG path data, so the browser can stitch any initials with no font file at runtime.
 * Run: node summit-suit-src/gen-monogram.mjs  (uses opentype.js from summit-customs/node_modules)
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(new URL("../summit-customs/package.json", import.meta.url));
const opentype = require("opentype.js");

const CSS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600";
const css = await (await fetch(CSS, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" } })).text();
const font = opentype.parse(await (await fetch(css.match(/url\((https:[^)]+\.ttf)\)/)[1])).arrayBuffer());

const SIZE = 100; // em size; caps sit on a baseline at y = 0 (path coordinates go up as negative y)
const glyphs = {};
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  const g = font.charToGlyph(ch);
  const bb = g.getPath(0, 0, SIZE).getBoundingBox();
  glyphs[ch] = { d: g.getPath(0, 0, SIZE).toPathData(1), adv: +((g.advanceWidth / font.unitsPerEm) * SIZE).toFixed(1), x1: +bb.x1.toFixed(1), x2: +bb.x2.toFixed(1) };
}
const capH = +(-font.charToGlyph("H").getPath(0, 0, SIZE).getBoundingBox().y1).toFixed(1);
writeFileSync(new URL("../summit-suit/assets/monogram.json", import.meta.url), JSON.stringify({ font: "Cormorant Garamond Italic 600", size: SIZE, capH, glyphs }));
console.log("monogram glyphs:", Object.keys(glyphs).length, "capH", capH);
