/** Generated placeholder images for the web demo (SVG data URIs: no network, no stock photos). */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Neutral stand-in for a product photo: soft tone, product name, nothing decorative. */
export function productImage(_emoji: string, title: string, hue: number): string {
  const words = title.split(" ");
  const l1 = words.slice(0, 3).join(" "), l2 = words.slice(3, 6).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="hsl(${hue},12%,90%)"/>
  <rect x="250" y="210" width="300" height="300" rx="36" fill="hsl(${hue},10%,82%)"/>
  <text x="400" y="620" font-size="40" fill="hsl(${hue},8%,30%)" text-anchor="middle" font-family="-apple-system, Helvetica, Arial" font-weight="600">${esc(l1)}</text>
  <text x="400" y="672" font-size="40" fill="hsl(${hue},8%,30%)" text-anchor="middle" font-family="-apple-system, Helvetica, Arial" font-weight="600">${esc(l2)}</text>
  <text x="400" y="740" font-size="24" fill="hsl(${hue},6%,55%)" text-anchor="middle" font-family="-apple-system, Helvetica, Arial">Sample photo</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function cardImage(en: string, cn: string, contact: string, phone: string, booth: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540">
  <rect width="900" height="540" rx="24" fill="#FBFAF8"/>
  <text x="70" y="110" font-size="44" fill="#222" font-family="Helvetica, Arial" font-weight="bold">${esc(cn)}</text>
  <text x="70" y="165" font-size="30" fill="#444" font-family="Helvetica, Arial">${esc(en)}</text>
  <text x="70" y="290" font-size="34" fill="#222" font-family="Helvetica, Arial">${esc(contact)} · Sales Manager</text>
  <text x="70" y="350" font-size="28" fill="#555" font-family="Helvetica, Arial">Tel/WeChat: ${esc(phone)}</text>
  <text x="70" y="400" font-size="28" fill="#555" font-family="Helvetica, Arial">Canton Fair Booth ${esc(booth)}</text>
  <rect x="690" y="300" width="160" height="160" fill="#222"/><rect x="705" y="315" width="130" height="130" fill="#FBFAF8"/><rect x="730" y="340" width="80" height="80" fill="#222"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
