/** Generated placeholder images for the web demo (SVG data URIs: no network, no stock photos). */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function productImage(emoji: string, title: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,28%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},60%,14%)"/></linearGradient></defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <text x="400" y="430" font-size="300" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="400" y="700" font-size="40" fill="#fff" fill-opacity="0.85" text-anchor="middle" font-family="Helvetica, Arial">${esc(title.slice(0, 30))}</text>
  <text x="40" y="70" font-size="28" fill="#fff" fill-opacity="0.5" font-family="Helvetica, Arial">DEMO PHOTO</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function cardImage(en: string, cn: string, contact: string, phone: string, booth: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540">
  <rect width="900" height="540" rx="24" fill="#f7f3ea"/><rect x="0" y="0" width="30" height="540" fill="#c0392b"/>
  <text x="70" y="110" font-size="44" fill="#222" font-family="Helvetica, Arial" font-weight="bold">${esc(cn)}</text>
  <text x="70" y="165" font-size="30" fill="#444" font-family="Helvetica, Arial">${esc(en)}</text>
  <text x="70" y="290" font-size="34" fill="#222" font-family="Helvetica, Arial">${esc(contact)} · Sales Manager</text>
  <text x="70" y="350" font-size="28" fill="#555" font-family="Helvetica, Arial">Tel/WeChat: ${esc(phone)}</text>
  <text x="70" y="400" font-size="28" fill="#555" font-family="Helvetica, Arial">Canton Fair Booth ${esc(booth)}</text>
  <rect x="690" y="300" width="160" height="160" fill="#222"/><rect x="705" y="315" width="130" height="130" fill="#f7f3ea"/><rect x="730" y="340" width="80" height="80" fill="#222"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
