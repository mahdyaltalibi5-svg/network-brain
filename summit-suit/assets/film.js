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
const CUFF_TARGET = WIDE ? .345 : .5;
const CUFF_TARGET_Y = WIDE ? .62 : .25;

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
// Drawn in SVG to match the last frame's lighting: charcoal sleeve above, white poplin cuff below,
// smoke behind. Gradients and patterns only (no filters on large shapes), so it composites cheaply.
const NS = 'http://www.w3.org/2000/svg';
const cuff = document.getElementById('cuff');
cuff.innerHTML = `
<svg viewBox="250 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
 <defs>
  <radialGradient id="cf-bg" cx="50%" cy="22%" r="85%"><stop offset="0" stop-color="#2b2b2c"/><stop offset=".55" stop-color="#0e0e0f"/><stop offset="1" stop-color="#030303"/></radialGradient>
  <radialGradient id="cf-fog" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="cf-sleeve" x1="0" x2="1"><stop offset="0" stop-color="#0b0b0b"/><stop offset=".18" stop-color="#232323"/><stop offset=".4" stop-color="#363636"/><stop offset=".62" stop-color="#282828"/><stop offset=".86" stop-color="#161616"/><stop offset="1" stop-color="#080808"/></linearGradient>
  <linearGradient id="cf-sleeve-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".93" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
  <pattern id="cf-twill" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-38) scale(.7)"><rect width="7" height="7" fill="none"/><path d="M0 1.5H7" stroke="#fff" stroke-opacity=".022" stroke-width="1.4"/><path d="M0 5H7" stroke="#000" stroke-opacity=".1" stroke-width="1"/></pattern>
  <linearGradient id="cf-cuff" x1="0" x2="1"><stop offset="0" stop-color="#8f8b84"/><stop offset=".12" stop-color="#cbc7bf"/><stop offset=".34" stop-color="#f3f0ea"/><stop offset=".52" stop-color="#ebe7e0"/><stop offset=".78" stop-color="#cfcac2"/><stop offset=".94" stop-color="#99958d"/><stop offset="1" stop-color="#6f6b65"/></linearGradient>
  <linearGradient id="cf-cuff-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".62"/><stop offset=".16" stop-color="#000" stop-opacity=".08"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
  <pattern id="cf-poplin" width="4" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5H4" stroke="#000" stroke-opacity=".045" stroke-width="1"/><path d="M1 0V3" stroke="#fff" stroke-opacity=".05" stroke-width=".8"/></pattern>
  <radialGradient id="cf-mop" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#ebe8e2"/><stop offset=".75" stop-color="#d6d9dc"/><stop offset="1" stop-color="#b9b3ab"/></radialGradient>
  <radialGradient id="cf-horn" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#5a4d44"/><stop offset=".5" stop-color="#2a221e"/><stop offset="1" stop-color="#0f0c0b"/></radialGradient>
  <filter id="cf-soft" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity=".55"/></filter>
  <clipPath id="cf-cuff-clip"><path d="${CUFF_PATH()}"/></clipPath>
  <pattern id="cf-satin" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(62)"><rect width="3.2" height="3.2" style="fill:var(--thread)"/><path d="M0 .7H3.2" stroke="#fff" stroke-opacity=".26" stroke-width=".7"/><path d="M0 2.3H3.2" stroke="#000" stroke-opacity=".28" stroke-width=".6"/></pattern>
  <linearGradient id="cf-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
 </defs>
 <rect x="-800" y="-1600" width="3200" height="3600" fill="#030303"/>
 <rect width="1600" height="900" fill="url(#cf-bg)"/>
 <ellipse cx="800" cy="880" rx="980" ry="190" fill="url(#cf-fog)"/>
 <ellipse cx="260" cy="760" rx="520" ry="120" fill="url(#cf-fog)" opacity=".7"/>
 <g filter="url(#cf-soft)">
  <path d="${CUFF_PATH()}" fill="url(#cf-cuff)"/>
 </g>
 <g clip-path="url(#cf-cuff-clip)">
  <rect x="200" y="380" width="1200" height="340" fill="url(#cf-poplin)"/>
  <rect x="200" y="380" width="1200" height="340" fill="url(#cf-cuff-v)"/>
  <path d="M276 448V636Q276 664 304 666Q800 688 1296 666Q1324 664 1324 636V448" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-dasharray="8 6" transform="translate(0 1.2)"/>
  <path d="M276 448V636Q276 664 304 666Q800 688 1296 666Q1324 664 1324 636V448" fill="none" stroke="#9c968c" stroke-width="2" stroke-dasharray="8 6"/>
  <g id="cf-mono"></g>
 </g>
 <g transform="translate(1238 566)">
  <ellipse cx="2" cy="8" rx="30" ry="26" fill="#000" opacity=".28"/>
  <circle r="29" fill="url(#cf-mop)" stroke="#a7a198" stroke-width="1.2"/>
  <circle r="21" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
  <g fill="#8e877d"><circle cx="-7" cy="-7" r="3.4"/><circle cx="7" cy="-7" r="3.4"/><circle cx="-7" cy="7" r="3.4"/><circle cx="7" cy="7" r="3.4"/></g>
  <path d="M-7-7 7 7M7-7-7 7" stroke="#e9e5de" stroke-width="2.6" stroke-linecap="round"/>
 </g>
 <g filter="url(#cf-soft)">
  <path d="M120-1600H1480V398Q800 452 120 398Z" fill="url(#cf-sleeve)"/>
 </g>
 <path d="M120-1600H1480V398Q800 452 120 398Z" fill="url(#cf-twill)"/>
 <path d="M120-1600H1480V398Q800 452 120 398Z" fill="url(#cf-sleeve-v)"/>
 <path d="M120 396Q800 450 1480 396" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="2"/>
 <path d="M120 372Q800 426 1480 372" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.6" stroke-dasharray="3 5"/>
 <g>${[0, 1, 2, 3].map(n => {
   const x = 1060 + n * 46, y = 330 + n * 1.5;
   return `<g transform="translate(${x} ${y})"><ellipse cx="2" cy="5" rx="23" ry="21" fill="#000" opacity=".5"/><circle r="22" fill="url(#cf-horn)" stroke="#000" stroke-opacity=".6"/><circle r="15.5" fill="none" stroke="#fff" stroke-opacity=".08"/><g fill="#050404"><circle cx="-5" cy="-5" r="2.6"/><circle cx="5" cy="-5" r="2.6"/><circle cx="-5" cy="5" r="2.6"/><circle cx="5" cy="5" r="2.6"/></g><path d="M-5-5 5 5M5-5-5 5" stroke="#3a3a3a" stroke-width="1.8" stroke-linecap="round"/></g>`;
 }).join('')}</g>
</svg>`;
function frameCuff() {
  const s = cuff.querySelector('svg');
  if (WIDE) { s.setAttribute('viewBox', '250 0 1600 900'); return; }
  const vw = 1180, vh = vw * innerHeight / innerWidth;
  s.setAttribute('viewBox', `210 ${(552 - CUFF_TARGET_Y * vh).toFixed(0)} ${vw} ${vh.toFixed(0)}`);
}
frameCuff(); addEventListener('resize', frameCuff);
function CUFF_PATH() { return 'M240 392H1360V640Q1360 690 1310 692Q800 714 290 692Q240 690 240 640Z'; }

/* Monogram: Cormorant Garamond Italic capitals (assets/monogram.json), stitched in two passes like
   a real embroidery head: a running-stitch outline, then satin fill sweeping across each letter. */
const THREADS = { navy: '#1f2b4a', burgundy: '#5b1a24', charcoal: '#2a2b2e', gold: '#a8823c' };
const mono = cuff.querySelector('#cf-mono');
const svg = cuff.querySelector('svg');
let glyphData = null, parts = [], replay = null;
const CAP = 118, CX = 800, BASE = 618;

function setThread(name) {
  svg.style.setProperty('--thread', THREADS[name] || THREADS.navy);
  mono.querySelectorAll('.o').forEach(p => p.setAttribute('stroke', THREADS[name] || THREADS.navy));
}
function build(initials) {
  if (!glyphData) return;
  const letters = (initials || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).split('');
  if (!letters.length) letters.push('S', 'C');
  const k = CAP / glyphData.capH, gap = 52;
  const ws = letters.map(ch => (glyphData.glyphs[ch].x2 - glyphData.glyphs[ch].x1) * k);
  const total = ws.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  let x = CX - total / 2;
  mono.textContent = '';
  parts = [];
  const thread = getComputedStyle(svg).getPropertyValue('--thread').trim() || THREADS.navy;
  letters.forEach((ch, i) => {
    const g = glyphData.glyphs[ch];
    const id = `cf-clip-${i}`;
    const grp = document.createElementNS(NS, 'g');
    grp.setAttribute('transform', `translate(${(x - g.x1 * k).toFixed(1)} ${BASE}) scale(${k.toFixed(4)})`);
    grp.innerHTML = `<clipPath id="${id}"><rect class="r" x="${g.x1 - 2}" y="${-CAP}" height="${CAP * 1.6}" width="0"/></clipPath>
      <path d="${g.d}" fill="#000" fill-opacity=".28" transform="translate(.4 .9)" clip-path="url(#${id})"/>
      <path class="f" d="${g.d}" fill="url(#cf-satin)" clip-path="url(#${id})"/>
      <path class="f2" d="${g.d}" fill="url(#cf-sheen)" clip-path="url(#${id})"/>
      <path class="o" d="${g.d}" fill="none" stroke="${thread}" stroke-width="${(1.5 / k).toFixed(3)}" stroke-linejoin="round"/>`;
    mono.appendChild(grp);
    const o = grp.querySelector('.o'), len = o.getTotalLength();
    o.style.strokeDasharray = `${len} ${len}`;
    parts.push({ o, len, r: grp.querySelector('.r'), w: g.x2 - g.x1 + 4 });
    x += ws[i];
    if (i < letters.length - 1) {
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', (x + gap / 2).toFixed(1)); dot.setAttribute('cy', BASE - CAP * .32); dot.setAttribute('r', 5.5);
      dot.setAttribute('fill', 'url(#cf-satin)');
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
  scrollTrigger: { trigger: '#film', start: 'top top', end: () => `+=${Math.round(innerHeight * (PORTRAIT ? 6.2 : 6.6))}`,
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
tl.to({}, { duration: .9 }, 12.9);

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
