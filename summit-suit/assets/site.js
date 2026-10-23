// Shared behaviour for every Summit Customs page. Needs gsap + ScrollTrigger loaded first.
(() => {
gsap.registerPlugin(ScrollTrigger);
const nav = document.getElementById('nav');
const past = on => { nav.classList.toggle('solid', on); document.body.classList.toggle('past', on); };
window.summitPast = past;

gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

// Pages without the film: nav goes solid and the phone booking bar appears after a little scroll.
// (The home page drives this from the end of its film instead.)
if (!document.getElementById('film')) {
  const check = () => past(scrollY > 60);
  addEventListener('scroll', check, { passive: true }); check();
}

// Headings rise line by line inside their reveal blocks
document.querySelectorAll('.rv .h2, .rv .quote, .phero h1').forEach(h => {
  h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="ln"><span>${l}</span></span>`).join('');
});

// Gentle parallax on photography
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.card figure img, .gallery figure img, .cloth figure img, .split figure img, .phero-media img').forEach(img => {
    gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

// Mobile menu
const menuBtn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
const setMenu = open => {
  document.body.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.setAttribute('aria-hidden', !open);
};
menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

// Photo viewer: gallery figures, plus any [data-lb] element (grouped by its nearest [data-lb-group])
const lb = document.getElementById('lb');
if (lb) {
  const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-cap');
  let items = [], cur = 0, lastFocus = null;
  const src = el => el.dataset.full || el.querySelector('img').src.replace('-640.', '-1100.');
  const cap = el => el.dataset.cap || (el.querySelector('figcaption') || {}).textContent || '';
  const showAt = i => {
    cur = (i + items.length) % items.length;
    lbImg.src = src(items[cur]); lbImg.alt = (items[cur].querySelector('img') || {}).alt || cap(items[cur]);
    lbCap.textContent = cap(items[cur]);
    lb.classList.toggle('single', items.length < 2);
  };
  const open = (group, i) => { items = group; lastFocus = document.activeElement; showAt(i); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-x').focus(); };
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
  const bind = (group) => group.forEach((el, i) => {
    if (el.tagName !== 'BUTTON') { el.tabIndex = 0; el.setAttribute('role', 'button'); }
    el.addEventListener('click', () => open(group, i));
    el.addEventListener('keydown', e => { if (el.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(group, i); } });
  });
  document.querySelectorAll('.gallery').forEach(g => bind([...g.querySelectorAll('figure')]));
  document.querySelectorAll('[data-lb-group]').forEach(g => bind([...g.querySelectorAll('[data-lb]')]));
  lb.querySelector('.lb-x').addEventListener('click', close);
  lb.querySelector('.lb-p').addEventListener('click', () => showAt(cur - 1));
  lb.querySelector('.lb-n').addEventListener('click', () => showAt(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!lb.hidden) close(); else if (document.body.classList.contains('menu-open')) setMenu(false); }
    if (lb.hidden) return;
    if (e.key === 'ArrowLeft') showAt(cur - 1);
    if (e.key === 'ArrowRight') showAt(cur + 1);
  });
} else {
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });
}

// Section reveals
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
// Page heroes reveal straight away
requestAnimationFrame(() => document.querySelectorAll('.phero').forEach(el => el.classList.add('in')));

// Closing title, letter by letter
const title = document.getElementById('ctaTitle');
if (title) {
  const label = title.textContent.replace(/\s+/g, ' ').trim();
  (function split(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        [...n.textContent].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch === ' ' ? ' ' : ch; f.appendChild(s); });
        n.replaceWith(f);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') split(n);
    });
  })(title);
  title.setAttribute('aria-label', label);
  gsap.from('#ctaTitle .ch', { opacity: 0, y: 40, filter: 'blur(12px)', stagger: .035, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '#cta', start: 'top 65%' } });
}
})();
