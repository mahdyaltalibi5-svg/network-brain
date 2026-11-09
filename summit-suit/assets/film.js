// The Anatomy of a Suit: the home page film. Needs gsap + ScrollTrigger (and Lenis, optional).
//
// I–IV  199 frames at 24fps cut from the 4K Kling clip: shirt and tie, waistcoat, jacket, the
//       finished suit. Portrait screens get a centre-cropped, lighter set.
// V     The camera pushes into the left cuff and cuts to a close-up where the client's initials
//       are embroidered as you scroll. Visitors can type their own.
//
// Smoothness: the timeline only moves numbers; one rAF draw renders them. Adjacent frames are
// cross-faded by the fractional frame, so the film never steps, and frames are decoded before
// they're first drawn. Captions animate transform/opacity only.
(() => {
const COUNT = 199;
const PORTRAIT = innerWidth < innerHeight;
const DIR = PORTRAIT ? 'frames-m' : 'frames';
const src = i => `/${DIR}/f_${String(i).padStart(3, '0')}.webp`;
// The suit's left shirt cuff in the last frame (source pixels). frames-m is a centre crop (x − 709).
const CUFF = PORTRAIT ? { x: 644, y: 967 } : { x: 1353, y: 967 };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// On landscape screens the close-up sits left of centre (the cuff ends ~34% across), so caption V
// has the right third to itself. The push-in steers the cuff to the same spot.
const WIDE = innerWidth / innerHeight >= 1.15;
const CUFF_TARGET = WIDE ? .3 : .5;
const CUFF_TARGET_Y = WIDE ? .64 : .275;

const film = document.getElementById('film');
const canvas = document.getElementById('seq'), ctx = canvas.getContext('2d', { alpha: false });
const loaderBar = document.querySelector('.loader i');
const state = { frame: 0, shift: 0, zoom: 0, stitch: 0, idle: 0 };
let idleWeight = 1; // 1 at the top of the page, 0 once the film is being scrubbed
const frames = new Array(COUNT);

/* ── Frames: first frame, then coarse-to-fine so the whole film scrubs almost at once ─────────── */
function load(i) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => { frames[i] = img; res(); });
    img.onerror = res;
    img.src = src(i);
  });
}
const order = [];
for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < COUNT; i += step) if (!order.includes(i)) order.push(i);
if (!order.includes(COUNT - 1)) order.splice(1, 0, COUNT - 1);
let loaded = 0;
load(0).then(() => {
  loaded = 1; draw(true);
  let next = 1;
  const lane = () => next < order.length ? load(order[next++]).then(() => {
    loaded++;
    if (loaderBar) loaderBar.style.transform = `scaleX(${loaded / COUNT})`;
    if (loaded === COUNT) document.querySelector('.loader').style.opacity = 0;
    draw(true);
    return lane();
  }) : null;
  for (let k = 0; k < 8; k++) lane();
});
const nearest = i => {
  for (let d = 0; d < COUNT; d++) {
    if (frames[i - d]) return frames[i - d];
    if (frames[i + d]) return frames[i + d];
  }
};

/* ── Canvas ───────────────────────────────────────────────────────────────────────────────────── */
let W = 0, H = 0, DPR = 1, lastKey = '';
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  draw(true);
}
const ease = t => t * t * (3 - 2 * t);
let softCtx = null;
function soft(q) {
  if (!softCtx) softCtx = document.createElement('canvas').getContext('2d', { alpha: false });
  const c = softCtx.canvas, w = Math.ceil(W * q), h = Math.ceil(H * q);
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  return softCtx;
}
let queued = false, force = false;
function draw(f) {
  force = force || !!f;
  if (queued) return;
  queued = true;
  requestAnimationFrame(render);
}
function render() {
  queued = false;
  const f = Math.max(0, Math.min(COUNT - 1, state.frame + state.idle * idleWeight));
  const i0 = Math.floor(f), a = f - i0;
  const key = `${f.toFixed(3)}|${state.shift.toFixed(3)}|${state.zoom.toFixed(4)}|${W}x${H}`;
  if (key === lastKey && !force) return;
  lastKey = key; force = false;
  const img0 = nearest(i0); if (!img0) return;
  const img1 = a > .01 && i0 + 1 < COUNT ? frames[i0 + 1] : null;
  const iw = img0.naturalWidth, ih = img0.naturalHeight;
  // Landscape: cover the screen with room for the sideways drift. Portrait: size the suit to ~76% of
  // the screen width so the spread shirt sleeves still fit (the suit spans ~598px of the frame).
  const wide = W / H >= 1 && iw > 1000;
  const s = wide ? Math.max(W * 1.2 / iw, H / ih) : (W * .76) / 598;
  const cy = wide ? .5 : .45;
  const off = wide ? state.shift * W * .1 : 0;
  let dx = W / 2 + off - iw * s / 2, dy = H * cy - ih * s / 2, sc = s;
  // Push-in to the cuff: scale up around the cuff while steering it to the frame's centre line.
  const k = ease(state.zoom);
  if (k > 0) {
    const z = 1 + 6.5 * k * k;
    const tx = (dx + CUFF.x * s) + (W * CUFF_TARGET - (dx + CUFF.x * s)) * k;
    const ty = (dy + CUFF.y * s) + (H * CUFF_TARGET_Y - (dy + CUFF.y * s)) * k;
    sc = s * z; dx = tx - CUFF.x * sc; dy = ty - CUFF.y * sc;
  }
  // A rack-focus blur during the push hides the upscaling and sells the cut to the close-up. It's done
  // by rendering into a small buffer and scaling it up (smoothing does the blur): canvas `filter`
  // blur runs on the CPU in some browsers and stalls frames.
  const q = k > .02 ? 1 / (1 + k * k * 9) : 1;
  const out = q < 1 ? soft(q) : ctx;
  out.setTransform(q < 1 ? q : DPR, 0, 0, q < 1 ? q : DPR, 0, 0);
  out.globalAlpha = 1;
  out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
  out.drawImage(img0, dx, dy, iw * sc, ih * sc);
  if (img1) { out.globalAlpha = a; out.drawImage(img1, dx, dy, iw * sc, ih * sc); out.globalAlpha = 1; }
  if (q < 1) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(out.canvas, 0, 0, Math.ceil(W * q), Math.ceil(H * q), 0, 0, canvas.width, canvas.height);
    return;
  }
  if (k > 0) return;
  // Feather the footage into the page wherever it doesn't reach the screen edge.
  const bottom = dy + ih * sc, band = Math.min(160, ih * sc * .25);
  if (bottom < H) {
    const g = ctx.createLinearGradient(0, bottom - band, 0, bottom);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, bottom - band, W, band + 1);
  }
  if (dy > 0) {
    const g = ctx.createLinearGradient(0, dy, 0, dy + band);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, dy - 1, W, band + 1);
  }
}
resize(); addEventListener('resize', resize);

/* ── V: the cuff close-up ─────────────────────────────────────────────────────────────────────── */
// A fabric macro painted once to a canvas (never per frame): the white poplin cuff as a lit
// cylinder under the charcoal sleeve, with weave, grain and soft shadow, tilted a few degrees like
// a photograph. The monogram is a small SVG layered on top, so stitching only repaints the letters.
const NS = 'http://www.w3.org/2000/svg';
const cuff = document.getElementById('cuff');
const ROT = -4 * Math.PI / 180;
cuff.innerHTML = `<canvas></canvas><svg aria-hidden="true" focusable="false"><defs></defs><g id="cf-mono"></g></svg>`;
const cuffCv = cuff.querySelector('canvas');
const svg = cuff.querySelector('svg');
const mono = cuff.querySelector('#cf-mono');
let L = null; // layout in CSS px, shared by the painting and the monogram
function layoutCuff(w, h) {
  return WIDE
    ? { w, h, x0: -.06 * w, x1: .635 * w, hemY: .33 * h, botY: .93 * h, sag: .05 * h, mx: CUFF_TARGET * w, my: CUFF_TARGET_Y * h, cap: Math.min(.1 * h, .075 * w) }
    : { w, h, x0: -.12 * w, x1: 1.12 * w, hemY: .13 * h, botY: .4 * h, sag: .022 * h, mx: .5 * w, my: CUFF_TARGET_Y * h, cap: .058 * h };
}
function tile(size, paint) {
  const t = document.createElement('canvas'); t.width = t.height = size;
  paint(t.getContext('2d'), size);
  return t;
}
function paintCuff() {
  const w = film.clientWidth, h = film.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  L = layoutCuff(w, h);
  cuffCv.width = Math.round(w * dpr); cuffCv.height = Math.round(h * dpr);
  const c = cuffCv.getContext('2d', { alpha: false });
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#030303'; c.fillRect(0, 0, w, h);
  const noise = c.createPattern(tile(160, (t, n) => {
    const d = t.createImageData(n, n);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() < .5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() * 22; }
    t.putImageData(d, 0, 0);
  }), 'repeat');
  const weave = c.createPattern(tile(4, t => {
    t.fillStyle = 'rgba(255,255,255,.06)'; t.fillRect(0, 0, 4, 1);
    t.fillStyle = 'rgba(0,0,0,.05)'; t.fillRect(0, 2, 4, 1); t.fillRect(1, 0, 1, 4);
  }), 'repeat');
  const twill = c.createPattern(tile(6, t => {
    t.strokeStyle = 'rgba(255,255,255,.035)'; t.lineWidth = 1.2;
    t.beginPath(); t.moveTo(-1, 7); t.lineTo(7, -1); t.moveTo(-4, 4); t.lineTo(4, -4); t.moveTo(2, 10); t.lineTo(10, 2); t.stroke();
  }), 'repeat');
  const { x0, x1, hemY, botY, sag } = L, cw = x1 - x0, xm = (x0 + x1) / 2;
  const arc = (p, y, dx = 0) => { p.moveTo(x0 - dx, y); p.quadraticCurveTo(xm, y + sag * 2, x1 + dx, y); };

  c.save();
  c.translate(L.mx, L.my); c.rotate(ROT); c.translate(-L.mx, -L.my);

  // Cuff: a cylinder lit from the upper left.
  const cuffShape = new Path2D();
  cuffShape.moveTo(x0, hemY - h * .2); cuffShape.lineTo(x1, hemY - h * .2); cuffShape.lineTo(x1, botY);
  cuffShape.quadraticCurveTo(xm, botY + sag * 2, x0, botY); cuffShape.closePath();
  c.save(); c.clip(cuffShape);
  let g = c.createLinearGradient(x0, 0, x1, 0);
  [[0, '#2f2d2a'], [.07, '#7d7a74'], [.22, '#cfccc5'], [.4, '#efece6'], [.52, '#e6e3dc'], [.72, '#aeaaa3'], [.9, '#5d5a55'], [1, '#262422']].forEach(([s, col]) => g.addColorStop(s, col));
  c.fillStyle = g; c.fillRect(x0, hemY - h * .2, cw, botY - hemY + h * .4);
  c.fillStyle = weave; c.fillRect(x0, 0, cw, h * 1.2);
  c.fillStyle = noise; c.fillRect(x0, 0, cw, h * 1.2);
  // the cloth rolls under at the bottom edge
  g = c.createLinearGradient(0, botY - (botY - hemY) * .22, 0, botY + sag);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.38)');
  c.fillStyle = g; c.fillRect(x0, hemY, cw, botY - hemY + sag * 2);
  // soft shadow cast by the sleeve hem, following its curve
  {
    const p = new Path2D(); arc(p, hemY - h * .03);
    c.save(); c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = h * .075 * dpr; c.shadowOffsetY = h * .05 * dpr;
    c.strokeStyle = '#000'; c.lineWidth = h * .05; c.stroke(p); c.stroke(p); c.restore();
  }
  // topstitching along the cuff edge: each stitch catches the light and casts a hair of shadow
  const inset = (botY - hemY) * .085, stitchRow = new Path2D(); arc(stitchRow, botY - inset);
  c.setLineDash([7, 4.5]); c.lineCap = 'round';
  c.translate(0, 1.2); c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1.7; c.stroke(stitchRow);
  c.translate(0, -1.2); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.stroke(stitchRow);
  c.setLineDash([]);
  c.restore();

  // Sleeve: charcoal wool, same light.
  const sleeve = new Path2D();
  const sx = cw * .025;
  sleeve.moveTo(x0 - sx, -h); sleeve.lineTo(x0 - sx, hemY); sleeve.quadraticCurveTo(xm, hemY + sag * 2, x1 + sx, hemY); sleeve.lineTo(x1 + sx, -h); sleeve.closePath();
  c.save(); c.clip(sleeve);
  g = c.createLinearGradient(x0 - sx, 0, x1 + sx, 0);
  [[0, '#040404'], [.08, '#151516'], [.26, '#2b2b2d'], [.4, '#38383a'], [.56, '#2a2a2c'], [.8, '#141415'], [1, '#040404']].forEach(([s, col]) => g.addColorStop(s, col));
  c.fillStyle = g; c.fillRect(x0 - sx, -h, cw + sx * 2, h * 2.2);
  c.fillStyle = twill; c.fillRect(x0 - sx, -h, cw + sx * 2, h * 2.2);
  c.fillStyle = noise; c.fillRect(x0 - sx, -h, cw + sx * 2, h * 2.2);
  g = c.createLinearGradient(0, -h * .1, 0, hemY + sag);
  g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(.55, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x0 - sx, -h, cw + sx * 2, h * 2.2);
  const hemRow = new Path2D(); arc(hemRow, hemY - (botY - hemY) * .09, sx);
  c.setLineDash([5, 4]); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.4; c.stroke(hemRow); c.setLineDash([]);
  const hemEdge = new Path2D(); arc(hemEdge, hemY - 1.5, sx);
  c.strokeStyle = 'rgba(255,255,255,.09)'; c.lineWidth = 2; c.stroke(hemEdge);
  c.restore();
  c.restore();

  // Lens falloff: the eye goes to the monogram, the edges go to black like the rest of the film.
  const r = Math.hypot(w, h);
  g = c.createRadialGradient(L.mx, L.my, r * .14, L.mx, L.my, r * .62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.82)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  mono.setAttribute('transform', `rotate(-4 ${L.mx.toFixed(1)} ${L.my.toFixed(1)})`);
}
paintCuff();
let cuffTimer = 0;
addEventListener('resize', () => { clearTimeout(cuffTimer); cuffTimer = setTimeout(() => { paintCuff(); build(input?.value); }, 150); });

/* Monogram: Cormorant Garamond Italic capitals (assets/monogram.json), stitched in two passes like
   a real embroidery head: a running-stitch outline, then satin fill sweeping across each letter. */
const THREADS = { navy: '#1c2747', burgundy: '#5a1823', charcoal: '#27282b', gold: '#a07a34' };
let glyphData = null, parts = [], replay = null, thread = THREADS.navy;

function setThread(name) {
  thread = THREADS[name] || THREADS.navy;
  mono.querySelectorAll('[data-t]').forEach(p => p.setAttribute(p.dataset.t, thread));
}
function build(initials) {
  if (!glyphData || !L) return;
  const letters = (initials || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).split('');
  if (!letters.length) letters.push('S', 'C');
  const k = L.cap / glyphData.capH, gap = L.cap * .44, capU = glyphData.capH;
  const ws = letters.map(ch => (glyphData.glyphs[ch].x2 - glyphData.glyphs[ch].x1) * k);
  const total = ws.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  const base = L.my + L.cap / 2;
  let x = L.mx - total / 2;
  // Satin stitch: fine diagonal threads, about 2px apart on screen whatever the letter size.
  const pitch = 2.1 / k;
  svg.querySelector('defs').innerHTML = `
    <pattern id="cf-satin" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse" patternTransform="rotate(58)">
      <path d="M0 ${pitch * .25}H${pitch}" stroke="#fff" stroke-opacity=".3" stroke-width="${pitch * .3}"/>
      <path d="M0 ${pitch * .78}H${pitch}" stroke="#000" stroke-opacity=".34" stroke-width="${pitch * .3}"/>
    </pattern>
    <linearGradient id="cf-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>`;
  mono.textContent = '';
  parts = [];
  letters.forEach((ch, i) => {
    const g = glyphData.glyphs[ch];
    const id = `cf-clip-${i}`;
    const grp = document.createElementNS(NS, 'g');
    grp.setAttribute('transform', `translate(${(x - g.x1 * k).toFixed(1)} ${base.toFixed(1)}) scale(${k.toFixed(4)})`);
    grp.innerHTML = `<clipPath id="${id}"><rect class="r" x="${g.x1 - 3}" y="${-capU * 1.2}" height="${capU * 1.7}" width="0"/></clipPath>
      <g clip-path="url(#${id})">
        <path d="${g.d}" fill="#000" fill-opacity=".3" transform="translate(${.8 / k} ${1.8 / k})"/>
        <path d="${g.d}" fill="#000" fill-opacity=".22" transform="translate(${.3 / k} ${.8 / k})"/>
        <path d="${g.d}" fill="${thread}" data-t="fill"/>
        <path d="${g.d}" fill="url(#cf-satin)"/>
        <path d="${g.d}" fill="url(#cf-sheen)"/>
      </g>
      <path class="o" d="${g.d}" fill="none" stroke="${thread}" data-t="stroke" stroke-width="${(1.1 / k).toFixed(3)}" stroke-linejoin="round"/>`;
    mono.appendChild(grp);
    const o = grp.querySelector('.o'), len = o.getTotalLength();
    o.style.strokeDasharray = `${len} ${len}`;
    parts.push({ o, len, r: grp.querySelector('.r'), w: g.x2 - g.x1 + 6 });
    x += ws[i];
    if (i < letters.length - 1) {
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', (x + gap / 2).toFixed(1)); dot.setAttribute('cy', (base - L.cap * .3).toFixed(1)); dot.setAttribute('r', (L.cap * .04).toFixed(1));
      dot.setAttribute('fill', thread); dot.dataset.t = 'fill';
      mono.appendChild(dot);
      parts.push({ dot });
      x += gap;
    }
  });
  stitch(state.stitch);
}
// p: 0 → 1 across the whole monogram. Outlines run first, satin fill follows a beat behind.
function stitch(p) {
  const letters = parts.filter(q => q.o), n = letters.length || 1;
  let li = 0;
  for (const q of parts) {
    if (q.dot) { q.dot.style.opacity = p > .55 + (li / n) * .4 ? 1 : 0; continue; }
    const o0 = (li / n) * .55, o1 = o0 + (1 / n) * .55 * 1.5;
    const s0 = .4 + (li / n) * .58, s1 = s0 + (1 / n) * .58 * 1.25;
    const po = Math.min(1, Math.max(0, (p - o0) / (o1 - o0)));
    const ps = Math.min(1, Math.max(0, (p - s0) / (s1 - s0)));
    q.o.style.strokeDashoffset = (q.len * (1 - po)).toFixed(1);
    q.r.setAttribute('width', (q.w * ease(ps)).toFixed(2));
    li++;
  }
}
const params = new URLSearchParams(location.search);
fetch('/assets/monogram.json').then(r => r.json()).then(j => {
  glyphData = j;
  setThread('navy');
  build(params.get('initials') || input?.value || 'SC');
});

/* ── Captions ─────────────────────────────────────────────────────────────────────────────────── */
document.querySelectorAll('#film .panel h2').forEach(h => {
  h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="ln"><span>${l}</span></span>`).join('');
});

/* ── Personalisation (panel V) ────────────────────────────────────────────────────────────────── */
const input = document.getElementById('mono-in');
const book = document.getElementById('mono-book');
function syncBook() {
  if (!book || !input) return;
  const v = input.value.toUpperCase().replace(/[^A-Z]/g, '');
  const u = new URL(book.href, location.href);
  u.searchParams.set('occasion', 'Shirts');
  if (v) u.searchParams.set('notes', `Monogram: ${v.split('').join('.')}`); else u.searchParams.delete('notes');
  book.href = u.toString();
}
function playStitch() {
  if (replay) replay.kill();
  const t = { p: 0 };
  replay = gsap.to(t, { p: 1, duration: REDUCED ? 0 : 1.8, ease: 'power1.inOut', onUpdate: () => stitch(t.p), onComplete: () => { replay = null; stitch(state.stitch); } });
}
if (input) {
  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    build(input.value); syncBook();
    if (state.stitch > .98) playStitch();
  });
  syncBook();
}
document.querySelectorAll('.mono-ui .threads button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mono-ui .threads button').forEach(x => x.setAttribute('aria-pressed', x === b));
  setThread(b.dataset.thread);
}));

/* ── Timeline: one unit per second of footage ─────────────────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);
const V0 = .8, at = sec => V0 + sec;
const CH = [['shirt', at(2.4)], ['vest', at(4.4)], ['jacket', at(5.4)], ['complete', at(6.8)], ['sign', 11.2]];
const rail = [...document.querySelectorAll('.chapters li')];
const bar = document.querySelector('.film-bar');
let activeCh = -1;
const tl = gsap.timeline({
  defaults: { ease: 'power2.out' },
  onUpdate() {
    draw();
    if (replay) { /* typing replay owns the monogram */ } else stitch(state.stitch);
    const t = tl.time();
    idleWeight = Math.max(0, 1 - t / V0);
    let c = -1; CH.forEach(([, s], i) => { if (t >= s - .15) c = i; });
    if (c !== activeCh) { activeCh = c; rail.forEach((li, i) => li.classList.toggle('on', i === c)); }
    if (bar) bar.style.transform = `scaleX(${tl.progress().toFixed(4)})`;
  },
  scrollTrigger: { trigger: '#film', start: 'top top', end: () => `+=${Math.round(innerHeight * (PORTRAIT ? 5.2 : 5.4))}`,
    scrub: window.__lenis ? .35 : .7, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
});
const panel = (k, start, hold) => {
  const el = `[data-p="${k}"]`, lines = `${el} h2 .ln>span`;
  tl.fromTo(el, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: .55 }, start)
    .fromTo(`${el} .eyebrow`, { '--rule': 0 }, { '--rule': 1, duration: .6 }, start)
    .fromTo(lines, { y: 0, yPercent: 105 }, { y: 0, yPercent: 0, duration: .6, stagger: .08, ease: 'power3.out' }, start + .05);
  if (hold) tl.to(el, { autoAlpha: 0, y: -22, duration: .4, ease: 'power2.in' }, start + hold);
};
tl.to(state, { frame: COUNT - 1, duration: (COUNT - 1) / 24, ease: 'none' }, V0)
  // The title parts like a curtain as the film begins.
  .to('.hero .display .a', { autoAlpha: 0, xPercent: -26, duration: .9, ease: 'power2.in' }, .1)
  .to('.hero .display .b', { autoAlpha: 0, xPercent: 26, duration: .9, ease: 'power2.in' }, .1)
  .to('.hero .foot', { autoAlpha: 0, duration: .5 }, .1)
  .to('.scroll-cue', { autoAlpha: 0, duration: .3, overwrite: true }, 0)
  .to('.chapters', { autoAlpha: 1, duration: .5 }, at(2.1));
const drift = (to, t) => tl.to(state, { shift: to, duration: 1.1, ease: 'sine.inOut' }, t);
// Captions follow the film: shirt and tie ~2.5-3.5s, waistcoat dissolves in ~5.1-5.6s, jacket wraps on
// ~5.7-6.6s, suit settles ~6.8s.
drift(1, .95); drift(-1, at(4.1)); drift(1, at(5.1)); drift(-1, at(6.4));
// Prologue fills the stretch where the figure gathers light, before the first garment.
panel('pro', 1.25, 1.2);
panel('shirt', CH[0][1], 1.5);
panel('vest', CH[1][1], 1.0);
panel('jacket', CH[2][1], 1.1);
panel('complete', CH[3][1], 1.75);
// V: centre the suit, push into the left cuff, cut to the close-up, embroider.
tl.to(state, { shift: 0, duration: .7, ease: 'sine.inOut' }, 9.0)
  .to(state, { zoom: 1, duration: 1.5, ease: 'power1.in' }, 9.25)
  .fromTo('#cuff', { autoAlpha: 0, scale: .86 }, { autoAlpha: 1, scale: 1, duration: .8, ease: 'power2.out' }, 10.2)
  .to(state, { stitch: 1, duration: 2.1, ease: 'none' }, 10.75);
panel('sign', CH[4][1]);
tl.to({}, { duration: .7 }, 12.9);

// At rest the figure breathes: the first frames ping-pong slowly until the visitor scrolls.
if (!REDUCED) {
  const b = { v: 0 };
  gsap.to(b, { v: 9, duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate() {
    const q = Math.round(b.v * 12) / 12;
    if (q !== state.idle) { state.idle = q; if (idleWeight > 0 && scrollY < innerHeight) draw(); }
  } });
}

// Nav turns solid once past the film
ScrollTrigger.create({ start: () => tl.scrollTrigger.end + 1, onEnter: () => window.summitPast(true), onLeaveBack: () => window.summitPast(false) });

// Debug: ?t=<timeline seconds> pauses there (used for screenshots).
if (params.has('t')) { tl.scrollTrigger.disable(false); tl.pause(+params.get('t')); }
window.__film = { tl, state };
})();
