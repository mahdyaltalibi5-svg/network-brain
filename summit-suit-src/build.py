#!/usr/bin/env python3
"""Builds the Summit Customs inner pages into ../summit-suit and keeps the home page's
shared header, menu, footer and overlays in sync with them.

Run:  python3 summit-suit-src/build.py
"""
import json, os, re, html
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, '..', 'summit-suit')
SITE = 'https://summitcustomsuits.com'
ASSET_HOST = 'https://summit-customs-suits.vercel.app'  # where og-image etc. live until the domain moves
BOOK = 'https://summitcustomsuits.com/book'
GMAP = 'https://www.google.com/maps/place/?q=place_id:ChIJ6_VVx3v1UocRr6uhoW6oEFE'
GREV = 'https://search.google.com/local/writereview?placeid=ChIJ6_VVx3v1UocRr6uhoW6oEFE'
BIZ = {'@id': SITE + '/#business'}

def book(occasion=None, notes=None):
    q = []
    if occasion: q.append('occasion=' + quote(occasion))
    if notes: q.append('notes=' + quote(notes))
    return BOOK + ('?' + '&'.join(q) if q else '')

# ------------------------------------------------------------------ shared chrome
NAV = [('Garments', '/services', [('Suits', '/suits'), ('Sport Coats', '/sport-coats'), ('Tuxedos', '/tuxedos'),
                                  ('Footwear', '/shoes'), ('Fabrics', '/fabrics'), ('All Services', '/services')]),
       ('Collection', '/collection', None), ('Capsules', '/capsule-wardrobe', None), ('Gallery', '/gallery', None),
       ('About', '/about', None), ('Contact', '/contact', None)]
MENU = [('Home', '/'), ('Suits', '/suits'), ('Sport Coats', '/sport-coats'), ('Tuxedos', '/tuxedos'), ('Footwear', '/shoes'),
        ('Fabrics', '/fabrics'), ('Collection', '/collection'), ('Capsule Wardrobe', '/capsule-wardrobe'),
        ('Gallery', '/gallery'), ('About Kobe', '/about'), ('Contact', '/contact')]

def header(active):
    items = []
    for label, href, sub in NAV:
        cur = ' aria-current="page"' if active in ([href] + [h for _, h in (sub or [])]) else ''
        if sub:
            links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if h == active else ""}>{l}</a>' for l, h in sub)
            items.append(f'<div class="dd"><a class="lnk" href="{href}"{cur}>{label}</a><div class="dd-menu">{links}</div></div>')
        else:
            items.append(f'<a class="lnk" href="{href}"{cur}>{label}</a>')
    menu = '\n    '.join(f'<a href="{h}"{" aria-current=\"page\"" if h == active else ""}>{l}</a>' for l, h in MENU)
    return f'''<header class="nav" id="nav">
  <a class="logo" href="/" aria-label="Summit Customs home"><img src="/img/mark.png" width="260" height="116" alt="Summit Customs mountain logo"><span>SUMMIT<span class="long"> CUSTOMS</span></span></a>
  <nav class="nav-r" aria-label="Main">
    {"".join(items)}
    <a class="btn" href="{BOOK}">Book<span class="long"> a Consultation</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><i></i><i></i></button>
  </nav>
</header>
<div id="menu" aria-hidden="true">
  <nav aria-label="Mobile">
    {menu}
  </nav>
  <div class="menu-foot">
    <a class="btn fill" href="{BOOK}">Book a Free Consultation</a>
    <a class="btn" href="tel:+18018669718">Call (801) 866-9718</a>
  </div>
</div>
<div class="progress" aria-hidden="true"><i></i></div>'''

FOOTER = f'''<footer>
  <div class="brand">
    <img src="/img/logo.webp" width="640" height="507" loading="lazy" decoding="async" alt="Summit Customs bespoke tailoring, Salt Lake City">
    <p>Bespoke suits, sport coats, and tuxedos for the man who refuses to compromise. Custom tailoring and image consulting in Salt Lake City, Utah.</p>
  </div>
  <nav aria-label="Garments">
    <h2>Garments</h2>
    <ul>
      <li><a href="/suits">Bespoke Suits</a></li>
      <li><a href="/sport-coats">Sport Coats</a></li>
      <li><a href="/tuxedos">Tuxedos</a></li>
      <li><a href="/shoes">Footwear</a></li>
      <li><a href="/fabrics">Fabrics</a></li>
      <li><a href="/collection">The Collection</a></li>
    </ul>
  </nav>
  <nav aria-label="Atelier">
    <h2>Atelier</h2>
    <ul>
      <li><a href="/services">Services</a></li>
      <li><a href="/capsule-wardrobe">Capsule Wardrobes</a></li>
      <li><a href="/gallery">Gallery</a></li>
      <li><a href="/about">About Kobe</a></li>
      <li><a href="{BOOK}">Book</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
  <div>
    <h2>Visit</h2>
    <address>
      Summit Customs<br>
      <a href="{GMAP}" target="_blank" rel="noopener">215 S State St, Suite 575<br>Salt Lake City, UT 84111</a><br>
      <a href="tel:+18018669718">(801) 866-9718</a><br>
      <a href="mailto:kobe@summitcustomsuits.com">kobe@summitcustomsuits.com</a><br>
      Mon&ndash;Sat &middot; 10am&ndash;6pm MST<br>
      <a href="https://www.instagram.com/summitcustomsuits/" rel="noopener" target="_blank">@summitcustomsuits</a><br>
      <a href="{GREV}" rel="noopener" target="_blank">&#9733; Review us on Google</a>
    </address>
  </div>
  <div class="copy"><span>&copy; 2026 Summit Customs. All rights reserved.</span><span>Bespoke tailoring &middot; Salt Lake City, Utah &middot; <a href="/privacy">Privacy</a></span></div>
  <div class="mega" aria-hidden="true">SUMMIT</div>
</footer>

<div class="mbar">
  <a href="{BOOK}">Book a Consultation</a>
  <a href="tel:+18018669718">Call</a>
</div>

<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Photo" hidden>
  <img alt="">
  <p class="lb-cap"></p>
  <button class="lb-x" type="button" aria-label="Close">&times;</button>
  <button class="lb-p" type="button" aria-label="Previous photo">&larr;</button>
  <button class="lb-n" type="button" aria-label="Next photo">&rarr;</button>
</div>'''

SCRIPTS = '''<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="/assets/site.js"></script>'''

def head(slug, title, desc, crumbs, schema=()):
    url = SITE + ('/' + slug if slug else '/')
    bc = {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE + h} for i, (n, h) in enumerate([('Home', '/')] + crumbs)]}
    graph = {'@context': 'https://schema.org', '@graph': [bc] + list(schema)}
    t, d = html.escape(title), html.escape(desc)
    return f'''<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="theme-color" content="#000000">
<meta name="geo.region" content="US-UT">
<meta name="geo.placename" content="Salt Lake City">
<meta name="geo.position" content="40.7645;-111.8879">
<meta name="ICBM" content="40.7645, -111.8879">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Summit Customs">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{ASSET_HOST}/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{ASSET_HOST}/og-image.jpg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">
{json.dumps(graph, indent=1, ensure_ascii=False)}
</script>
</head>
<body class="inner">
<script>document.documentElement.classList.add('js')</script>
<a class="skip" href="#main">Skip to content</a>
'''

def page(slug, title, desc, crumbs, body, schema=(), extra_js=''):
    active = '/' + slug
    doc = head(slug, title, desc, crumbs, schema) + header(active) + '\n<main id="main">\n' + body + '\n</main>\n\n' + FOOTER + '\n\n' + SCRIPTS + '\n' + extra_js + '\n</body>\n</html>\n'
    with open(os.path.join(OUT, (slug or 'index') + '.html'), 'w') as f:
        f.write(doc)
    return slug

def crumbs_html(crumbs):
    parts = ['<a href="/">Home</a>'] + [f'<a href="{h}">{n}</a>' if i < len(crumbs) - 1 else f'<span aria-current="page">{n}</span>' for i, (n, h) in enumerate(crumbs)]
    return '<nav class="crumbs" aria-label="Breadcrumb">' + '<i>/</i>'.join(parts) + '</nav>'

def img(name, alt, w=640, h=960, sizes='(max-width:900px) 100vw, 50vw', eager=False, big=1100):
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="/img/{name}-640.webp" srcset="/img/{name}-640.webp 640w, /img/{name}-1100.webp {big}w" sizes="{sizes}" '
            f'width="{w}" height="{h}" {load} decoding="async" alt="{alt}">')

def hero(crumbs, eyebrow, h1, lede, media=None, ctas=None, cls=''):
    ctas = ctas if ctas is not None else [('Book a Free Consultation', BOOK, 'fill'), ('Call (801) 866-9718', 'tel:+18018669718', '')]
    btns = ''.join(f'<a class="btn {c}" href="{h}">{l}</a>' for l, h, c in ctas)
    m = f'<div class="phero-media">{media}</div>' if media else ''
    return f'''<section class="phero{' text' if not media else ''} {cls}">
  {m}
  <div class="phero-in">
    {crumbs_html(crumbs)}
    <div class="eyebrow">{eyebrow}</div>
    <h1>{h1}</h1>
    <p class="lede">{lede}</p>
    <div class="ctas">{btns}</div>
  </div>
</section>'''

def cta(title_html, text, occasion=None, label='Book a Private Consultation'):
    return f'''<section class="cta cta-sm" id="cta" aria-labelledby="ctaTitle">
  <div>
    <img class="crest" src="/img/logo.webp" width="640" height="507" loading="lazy" decoding="async" alt="Summit Customs logo">
    <h2 id="ctaTitle">{title_html}</h2>
    <p>{text}</p>
    <div class="ctas">
      <a class="btn fill" href="{book(occasion)}">{label}</a>
      <a class="btn" href="tel:+18018669718">Call (801) 866-9718</a>
    </div>
  </div>
</section>'''

def service_schema(name, slug, desc, stype):
    return {'@type': 'Service', '@id': f'{SITE}/{slug}#service', 'name': name, 'serviceType': stype, 'description': desc,
            'url': f'{SITE}/{slug}', 'provider': BIZ, 'areaServed': [{'@type': 'City', 'name': 'Salt Lake City'}, {'@type': 'State', 'name': 'Utah'}]}

def webpage(slug, kind, name, extra=None):
    d = {'@type': kind, '@id': f'{SITE}/{slug}#webpage', 'url': f'{SITE}/{slug}', 'name': name, 'isPartOf': {'@id': SITE + '/#website'}, 'about': BIZ, 'inLanguage': 'en-US'}
    d.update(extra or {})
    return d

def heads(eyebrow, h2, lede='', center=False):
    return f'''<div class="sec-head rv{' c' if center else ''}">
    <div class="eyebrow">{eyebrow}</div>
    <h2 class="h2">{h2}</h2>
    {f'<p class="lede">{lede}</p>' if lede else ''}
  </div>'''

def feats(items, cols=3):
    return f'<div class="occ-grid cols-{cols}">' + ''.join(
        f'<article class="rv">{f"<i class=\"fi\">{n}</i>" if n else ""}<h3>{t}</h3><p>{p}</p></article>' for n, t, p in items) + '</div>'

def facts(items):
    return '<div class="facts rv">' + ''.join(f'<div><span>{a}</span><b>{b}</b><p>{c}</p></div>' for a, b, c in items) + '</div>'

PROCESS = [('01', 'The Consultation', 'In person in Salt Lake City or by video. We begin with a conversation about your lifestyle, occasions, and the impression you want to leave. Nothing is measured until we understand the man being dressed.'),
           ('02', 'The Cloth', 'You select from an extensive library of wools, linens, tweeds, and tropicals from Dormeuil, Scabal, Vitale Barberis Canonico, and Holland &amp; Sherry. We guide you toward what works for your body, climate, and occasion.'),
           ('03', 'The Construction', 'Your pattern is drawn to your body, not adapted from a standard block. Every seam, lining, and detail is considered. The garment is built around you, not bent to fit you.'),
           ('04', 'The Fitting', 'You try on something built entirely for you, with final refinements made on the spot. Your pattern stays on file, so reorders take half the time and need only one fitting.')]

def steps(items):
    return '<ol class="steps cols-%d">' % len(items) + ''.join(
        f'<li class="step rv"><div class="n">{n}</div><h3>{t}</h3><p>{p}</p></li>' for n, t, p in items) + '</ol>'

# ------------------------------------------------------------------ fabric catalogue data
FAB = json.load(open(os.path.join(ROOT, 'fabrics.json')))  # code -> {"img": id, "colour": .., "pattern": ..}
FAB_GROUPS = [
    ('Zero Gravity &mdash; Classico', 'Marlane', list(range(57501, 57509))),
    ('Extender&reg; 4 Seasons', 'Marlane', [57509, 57510, 57511, 57512, 57518, 57572, 57573, 57574, 57575, 57576]),
    ('Zero Gravity &mdash; Beyond', 'Marlane', list(range(57521, 57529))),
    ('Vivo Stretch', 'Marlane', [57529, 57530, 57531, 57532, 57533, 57534, 57535, 57536, 57537, 57538, 57539, 57541, 57542, 57543, 57544, 57545, 57546, 57547, 57549]),
    ('Linen &amp; Wool', 'Angelico', list(range(57550, 57556))),
    ('Summer Corduroy', 'Olimpias', list(range(57566, 57572))),
]
def swatch(code, mill):
    f = FAB[str(code)]
    col, pat = f['colour'].title(), f['pattern'].title()
    return (f'<figure class="sw"><img src="/img/fabric/{f["img"]}.webp" width="320" height="320" loading="lazy" decoding="async" '
            f'alt="{col} {pat.lower()} cloth from {mill}, code {code}"><figcaption><b>{code}</b>{col} &middot; {pat}</figcaption></figure>')

JACKET_SW = [('J27008', 'Fratelli Tallia di Delfino', 'Brown', 'Textured'), ('J27016', 'E. Thomas', 'Blue', 'Check'),
             ('J27021', 'Lassiere Mills', 'Grey', 'Check'), ('J27025', 'Marling &amp; Evans', 'Brown', 'Check'),
             ('J27034', 'Lanificio di Pray', 'Blue', 'Textured'), ('J27039', 'Marzotto', 'Navy', 'Textured'),
             ('J27055', 'Original', 'Navy', 'Solid'), ('J27068', 'Olimpias', 'White', 'Solid')]

# ------------------------------------------------------------------ pages
built = []

# Services --------------------------------------------------------
built.append(page('services',
  'Bespoke Tailoring Services in Salt Lake City | Summit Customs',
  'Custom suits, sport coats, tuxedos, dress trousers and overcoats, built to your measurements in Salt Lake City. 4,000+ cloths, one-on-one with Kobe Apponsah.',
  [('Services', '/services')],
  hero([('Services', '/services')], 'Bespoke Tailoring &middot; Salt Lake City', 'Made for you.<br><em>Only for you.</em>',
       'Every garment begins with a conversation and ends with something no one else owns. Your measurements, your cloth, your pattern, kept on file so every future order starts exactly where the last one left off.',
       img('tan-fitting', 'Client trying on a custom tan suit during a fitting at Summit Customs', 640, 853, '50vw', eager=True),
       [('Book a Free Consultation', BOOK, 'fill'), ('View the Collection', '/collection', '')]) +
  f'''
<section class="sec">
  {heads('What We Build', 'The garments.', 'We work with master craftsmen and the finest mills in England, Italy, and Japan. The result is a garment built to your body, not bent to fit it.')}
  {feats([('01', 'The Two-Piece Suit', 'The foundation. Jacket and trouser cut from the same cloth, the same pattern, the same intention. Formal enough for a boardroom, refined enough for an evening. <a class="more" href="/suits">Suits</a>'),
          ('02', 'The Three-Piece Suit', 'A waistcoat adds layering, formality, and a silhouette that no two-piece can replicate. Preferred for weddings, courtrooms, and anyone who understands what a suit is for.'),
          ('03', 'The Sport Coat', 'A jacket built to stand alone, in a different cloth, a different character. Worn with denim or tailored trousers. <a class="more" href="/sport-coats">Sport coats</a>'),
          ('04', 'The Dress Trouser', 'Tailored separately to your exact rise, break, and fit. Ordered alongside a jacket or on their own. Every pair cut to a pattern that exists only for you.'),
          ('05', 'The Tuxedo', 'Black tie done correctly. Peak or shawl lapels in barathea or grosgrain. A garment you own that fits every occasion it was made for. <a class="more" href="/tuxedos">Tuxedos</a>'),
          ('06', 'The Overcoat', 'A winter coat cut to the same standards as the suit beneath it. Cashmere, camel, or melton. The garment the world sees before it sees anything else.')])}
</section>

<section class="sec cloth" aria-labelledby="sv-cloth">
  <figure class="rv">{img('lapel', 'Close-up of a black bespoke tuxedo with silk lapel and white pocket square', 640, 640, '(max-width:900px) 100vw, 50vw', big=1024)}</figure>
  <div class="rv">
    <div class="eyebrow">The Cloth</div>
    <h2 class="h2" id="sv-cloth">4,000 cloths.<br><em>One choice.</em></h2>
    <p class="lede">An extensive library from the world's most respected mills: Dormeuil, Scabal, Vitale Barberis Canonico, Holland &amp; Sherry, and more. English wools, Italian superfine, Japanese technical weaves, and seasonal linens. During your consultation we walk you through the options suited to your climate, occasion, and body.</p>
    <a class="more" href="/fabrics">Browse fabric swatches</a>
  </div>
</section>

<section class="sec">
  {heads('How It Works', 'The process.')}
  {steps(PROCESS)}
  {facts([('Suit timeline', '5 to 8 weeks', 'From first consultation to final fitting. Rush orders are available in select circumstances; ask during your booking.'),
          ('Personal details', 'Made for you', 'Explore cloth, construction, and finishing details with Kobe to create garments that reflect your style.'),
          ('Your pattern', 'Kept for life', 'Once your pattern is cut, it stays on file. Every future order is faster, more precise, and needs only one fitting.')])}
</section>
''' + cta('One hour.<br><em>No obligation.</em>', 'The first consultation is complimentary. We talk, we listen, we measure. You leave knowing exactly what your garment will look like and what it will cost before you commit to anything.'),
  [webpage('services', 'WebPage', 'Bespoke Tailoring Services'),
   service_schema('Bespoke tailoring', 'services', 'Custom two- and three-piece suits, sport coats, dress trousers, tuxedos and overcoats built to the client\'s measurements in Salt Lake City.', 'Bespoke tailoring')]))

# Suits -----------------------------------------------------------
suit_sw = [57505, 57506, 57511, 57527, 57531, 57543, 57568, 57570]
built.append(page('suits',
  'Custom Suits in Salt Lake City | Two & Three-Piece | Summit Customs',
  'Custom two- and three-piece suits made to your measurements in Salt Lake City. Choose your cloth with Kobe Apponsah. 5 to 8 weeks from consultation to fitting.',
  [('Garments', '/services'), ('Suits', '/suits')],
  hero([('Garments', '/services'), ('Suits', '/suits')], 'The Suit', 'The foundation.<br><em>Elevated.</em>',
       'Start with the suit that fits your life. Explore cloth, colour, and styling with Kobe to create a two or three piece suit around your measurements and preferences.',
       img('suit', 'Kobe Apponsah fitting a client in a navy custom suit jacket', eager=True), [('Book a Suit Consultation', book('Bespoke Suit'), 'fill'), ('Call (801) 866-9718', 'tel:+18018669718', '')]) +
  f'''
<section class="sec split" aria-labelledby="su-pattern">
  <figure class="rv">{img('navy-blazer', 'Client in a navy custom jacket and pink shirt adjusting the lining')}</figure>
  <div class="rv">
    <div class="eyebrow">Your Pattern</div>
    <h2 class="h2" id="su-pattern">Built<br><em>around you.</em></h2>
    <p class="lede">Your measurements, posture, and preferences guide the fit. Through each fitting, we refine the balance and details until the suit feels natural on you. Two-piece for the boardroom and the evening after; three-piece when the occasion calls for structure and a silhouette no two-piece can match.</p>
    {facts([('Timeline', '5&ndash;8 weeks', 'Consultation through fitting'), ('Experience', 'One to one', 'Work directly with Kobe')])}
  </div>
</section>

<section class="sec">
  {heads('The Cloth', 'A curated<br><em>foundation.</em>', 'Available solids, checks, and seasonal cloths from our suit catalog. Discuss the cloth and occasion with Kobe during your consultation.')}
  <div class="swgrid rv">{''.join(swatch(c, 'Olimpias' if c >= 57566 else 'Marlane') for c in suit_sw)}</div>
  <a class="more" href="/fabrics">View the full catalog</a>
</section>
''' + cta('The first step is<br><em>a conversation.</em>', 'Tell us what you need from your next suit. Book a consultation to explore fabrics, discuss the fit, and plan your garment.', 'Bespoke Suit'),
  [webpage('suits', 'WebPage', 'Custom Suits'), service_schema('Custom suits', 'suits', 'Two- and three-piece suits made to measure in Salt Lake City, Utah.', 'Custom suit tailoring')]))

# Sport coats -----------------------------------------------------
built.append(page('sport-coats',
  'Custom Sport Coats & Blazers in Salt Lake City | Summit Customs',
  'Custom sport coats and blazers built to stand alone: softer cuts, richer textures, made to your measurements in Salt Lake City by Summit Customs.',
  [('Garments', '/services'), ('Sport Coats', '/sport-coats')],
  hero([('Garments', '/services'), ('Sport Coats', '/sport-coats')], 'The Sport Coat', 'Commanding.<br><em>Versatile.</em>',
       'A jacket built to stand alone, in a different cloth, a different character. The most powerful tool in a working wardrobe, bridging formal structure and personal style.',
       img('sportcoat', 'Kobe Apponsah in a navy custom sport coat over a grey turtleneck', eager=True), [('Book a Sport Coat Consultation', book('Bespoke Sport Coat'), 'fill'), ('Call (801) 866-9718', 'tel:+18018669718', '')]) +
  f'''
<section class="sec split rev" aria-labelledby="sc-not">
  <figure class="rv">{img('plaid-coat', 'Client wearing a green plaid custom sport coat with navy trousers', 640, 1107)}</figure>
  <div class="rv">
    <div class="eyebrow">Conceived Independently</div>
    <h2 class="h2" id="sc-not">Not a suit jacket<br><em>missing its trousers.</em></h2>
    <p class="lede">A true sport coat is conceived independently. The cut is softer, the texture is richer, and the details speak to its distinct purpose. It pairs as naturally with tailored denim as it does with worsted wool trousers.</p>
    <p class="lede">We build blazers and sport coats around the way you plan to wear them. Whether it is an unstructured linen piece for summer evenings or a heavier cloth for winter layers, the fitting begins with you.</p>
  </div>
</section>

<section class="sec">
  {feats([('01', 'Construction', 'Tailored specifically for standalone wear, offering exceptional mobility without sacrificing silhouette.'),
          ('02', 'Cloth', 'Access to bold textures and patterns that would overwhelm a full suit, curated precisely for jackets.')], 2)}
</section>

<section class="sec">
  {heads('The Cloth', 'Curated<br><em>textures.</em>', 'A selection from our jacket catalog, showing the range of colour, texture, and pattern available for a sport coat.')}
  <div class="swgrid rv">{''.join(f'<figure class="sw"><img src="/img/fabric/{i}.webp" width="320" height="320" loading="lazy" decoding="async" alt="{c} {p.lower()} jacket cloth from {html.unescape(m)}"><figcaption><b>{m}</b>{c} &middot; {p}</figcaption></figure>' for i, m, c, p in JACKET_SW)}</div>
</section>
''' + cta('A staple that is<br><em>uniquely yours.</em>', 'Ready to create the most versatile piece in your wardrobe? Book a consultation to explore cloths, textures, and fits in person.', 'Bespoke Sport Coat'),
  [webpage('sport-coats', 'WebPage', 'Custom Sport Coats'), service_schema('Custom sport coats and blazers', 'sport-coats', 'Sport coats and blazers made to measure in Salt Lake City, Utah.', 'Custom sport coat tailoring')]))

# Tuxedos ---------------------------------------------------------
built.append(page('tuxedos',
  "Custom Tuxedos in Salt Lake City | Own, Don't Rent | Summit Customs",
  'Bespoke tuxedos and evening wear in Salt Lake City: peak or shawl lapels in satin or grosgrain, black or midnight navy barathea, made to your measurements.',
  [('Garments', '/services'), ('Tuxedos', '/tuxedos')],
  hero([('Garments', '/services'), ('Tuxedos', '/tuxedos')], 'Black Tie Done Correctly', 'Own<br><em>the evening.</em>',
       "A garment you own, not rent. Bespoke evening wear tailored to your exact measurements for life's most defining moments.",
       f'<img src="/img/tux-evening-1100.webp" width="1024" height="1024" fetchpriority="high" decoding="async" alt="Gentleman in a bespoke black tuxedo by a tall window">',
       [('Book a Tuxedo Consultation', book('Bespoke Tuxedo'), 'fill'), ('Call (801) 866-9718', 'tel:+18018669718', '')]) +
  f'''
<section class="sec split" aria-labelledby="tx-arch">
  <figure class="rv">{img('lapel', 'Close-up of a black bespoke tuxedo with silk lapel, pleated shirt and pocket square', 640, 640, big=1024)}</figure>
  <div class="rv">
    <div class="eyebrow">The Architecture</div>
    <h2 class="h2" id="tx-arch">The architecture<br><em>of a proper tuxedo.</em></h2>
    <p class="lede">A tuxedo is not merely a black suit with shiny lapels. It is a completely different garment governed by its own rules of proportion, fabric, and finish.</p>
    <p class="lede">Whether you prefer the sharp angle of a peak lapel or the continuous flow of a shawl collar, the facing can be grosgrain or satin. Traditional tuxedo trousers carry a side braid and pair with side adjusters or suspenders.</p>
  </div>
</section>

<section class="sec">
  {feats([('', 'The Lapel', 'Satin or grosgrain facing on shawl or peak lapels. Never notch.'),
          ('', 'The Cloth', 'Deep midnight navy or jet black barathea wool that absorbs light beautifully in evening settings.')], 2)}
</section>

<section class="sec split rev" aria-labelledby="tx-navy">
  <figure class="rv">{img('tuxedo', 'Kobe Apponsah in a midnight navy peak lapel tuxedo')}</figure>
  <div class="rv">
    <div class="eyebrow">Midnight Navy</div>
    <h2 class="h2" id="tx-navy">A modern<br><em>standard.</em></h2>
    <p class="lede">Black tie does not mandate black cloth. A midnight navy tuxedo, often appearing blacker than black under artificial light, is a historic tradition that commands immense presence.</p>
    <p class="spec">Shown<b>Midnight navy peak lapel</b></p>
  </div>
</section>
''' + cta('Your next event<br><em>requires intention.</em>', 'Skip the rental counter. Commission a tuxedo designed for your measurements and the occasions ahead.', 'Bespoke Tuxedo'),
  [webpage('tuxedos', 'WebPage', 'Custom Tuxedos'), service_schema('Custom tuxedos and evening wear', 'tuxedos', 'Bespoke tuxedos made to measure in Salt Lake City, Utah.', 'Custom tuxedo tailoring')]))

# Collection ------------------------------------------------------
TIERS = [
  ('01', 'The Ascent', "For the guy entering the room with something to prove.",
   ["The Ascent is where most clients start, and for good reason. It's a complete, made-to-measure suit built around a single purpose: making you look like you belong in the next room up.",
    "Clean lines. Versatile construction. The kind of suit that works in a boardroom Tuesday and at dinner Friday without asking you to change who you are."],
   [('Professional / career milestone', 'Promotion, new role, high-stakes meeting'), ('First custom suit', "Guys who know something's missing but haven't defined it yet"), ('Everyday elevated', 'A suit that works across multiple contexts without overthinking it')],
   'Navy &middot; Charcoal &middot; Chocolate &middot; Grey &middot; Burgundy',
   [('Super 110s wool', 'Core offering'), ('Wool-linen blend', 'Spring / summer'), ('Wool-poly blend', 'High durability / travel')], None),
  ('02', 'The Summit', "For the guy who's arrived and wants it to show.",
   ['This is the flagship. The suit most clients graduate to once they know what fit actually feels like.',
    "The Summit gives you more: more fabric options, more customisation on the details, more presence in a room. It's built for the man who doesn't need to tell people where he's been. The suit does that."],
   [('The client who closes things', 'Deals, pitches, partnerships: rooms where the first impression is the whole impression'), ('Weddings: groom or prominent guest', 'Built to photograph, built to be remembered'), ('The suit you wear to everything important', 'Versatile enough to live across occasions, distinctive enough to own each one')],
   'Midnight navy &middot; Espresso &middot; Slate &middot; Storm &middot; Forest &middot; Cognac',
   [('Super 120s to 130s wool', 'Drape and softness'), ('Canvassed construction', 'Moves with the body over time'), ('Bemberg silk lining', 'Breathable, elevated finish'), ('Ermenegildo Zegna fabrics', 'Available on request')], 'Flagship'),
  ('03', 'The Standard', 'For the man who already knows exactly who he is.',
   ['This is the top of what we do. Reserved for clients who come in with a clear vision of what they want, and the patience to let the craft meet it.',
    'No compromises. The finest available fabrics, full canvas construction, and a level of detail work that takes longer because it should. Built once. Worn for decades.'],
   [('The event that defines the chapter', "A wedding, a milestone, a moment you'll have photos from for life"), ('The collector', 'Guys who understand quality compounding. Suit three is better because suits one and two taught them something.'), ('Gifted or commissioned', 'A suit given with intention, for a son, a partner, a person worth that level of thought.')],
   'Black navy &middot; Onyx &middot; Dark cognac &middot; Aubergine &middot; Ivory',
   [('Super 150s to 180s wool', 'The finest available weight'), ('Full floating canvas', 'Structured, drapes better with wear'), ('Loro Piana / Scabal', 'Available on request'), ('Custom silk lining', 'Monogrammed interior option')], None),
]
def tier(n, name, tag, paras, built_for, colours, fabrics, badge):
    bf = ''.join(f'<li><b>{a}</b><span>{b}</span></li>' for a, b in built_for)
    fb = ''.join(f'<li><b>{a}</b><span>{b}</span></li>' for a, b in fabrics)
    extra = '<p class="tier-note">Every Standard tier suit ships with a hand-stitched label and a written card detailing the fabric house, weight, and construction notes. The suit knows where it came from.</p>' if name == 'The Standard' else ''
    return f'''<article class="tier rv{' feat' if badge else ''}" id="{name.lower().replace(' ', '-')}">
    {f'<span class="badge">{badge}</span>' if badge else ''}
    <div class="eyebrow">Tier {n}</div>
    <h3>{name}</h3>
    <p class="tier-tag">{tag}</p>
    {''.join(f'<p>{p}</p>' for p in paras)}
    <h4>Built for</h4><ul class="tl">{bf}</ul>
    <h4>Colour direction</h4><p class="tier-col">{colours}</p>
    <h4>Fabric &amp; construction</h4><ul class="tl">{fb}</ul>
    {extra}
    <a class="btn{' fill' if badge else ''}" href="{book(name)}">Discuss {name}</a>
  </article>'''
built.append(page('collection',
  'The Collection: Three Tiers of Custom Suits | Summit Customs SLC',
  'The Ascent, The Summit and The Standard: three tiers of made-to-measure suits in Salt Lake City, from your first custom suit to full-canvas Super 180s.',
  [('Collection', '/collection')],
  hero([('Collection', '/collection')], 'Summit Customs &middot; The Collection', "Three tiers.<br><em>One standard.</em>",
       "Built for the man you're becoming. Every piece is made to measure. The difference between tiers is what you're dressing for, and how much of the details you want to own.",
       img('client-trio', 'Three Summit Customs clients in navy, charcoal and grey custom suits', 640, 960, eager=True)) +
  f'''
<section class="sec">
  {facts([('Personal service', 'Made for you', 'One-on-one with Kobe from consultation to delivery.'), ('Typical timeline', '5 to 8 weeks', 'From consultation to final fitting.'), ('Fit', 'Made to measure', 'Every tier is cut to your measurements.')])}
  <div class="tiers">{''.join(tier(*t) for t in TIERS)}</div>
</section>

<section class="sec">
  {heads('How It Works', 'From conversation<br><em>to yours.</em>')}
  {steps([('01', 'Consultation', "30 minutes, in person or by video. We talk about where you're going, what you need the suit to do, and which tier fits the occasion and your style."),
          ('02', 'Selection', 'Fabric, colour, and detail choices. You leave knowing exactly what you ordered and why. No guesswork.'),
          ('03', 'Fittings', 'Your measurements guide the garment. Fittings refine its balance and details before delivery.'),
          ('04', 'Yours', 'Delivered. Fitted. If anything needs adjusting, we handle it. You leave with a suit built for one person: you.')])}
</section>
''' + cta('Find your<br><em>tier.</em>', "Not sure which tier fits? That's what the first conversation is for. Thirty minutes, in person or by video.", None, 'Book a 30-Minute Consultation'),
  [webpage('collection', 'CollectionPage', 'The Collection'),
   {'@type': 'ItemList', 'name': 'Summit Customs suit tiers', 'itemListElement': [
       {'@type': 'ListItem', 'position': i + 1, 'item': {'@type': 'Service', 'name': t[1], 'description': t[2] + ' ' + t[3][0], 'provider': BIZ, 'url': f'{SITE}/collection#{t[1].lower().replace(" ", "-")}'}} for i, t in enumerate(TIERS)]}]))

# Capsule wardrobe -----------------------------------------------
CAPSULE_JS = r'''<script>
(() => {
  const counts = { 'Bespoke Suit': 1, 'Sport Coat': 3, 'Tuxedo': 0, 'Custom Shirt': 3 };
  let direction = '';
  const $ = s => document.querySelector(s);
  const render = () => {
    document.querySelectorAll('.stepper').forEach(st => { st.querySelector('output').textContent = counts[st.dataset.k]; st.querySelector('.minus').disabled = counts[st.dataset.k] === 0; });
    const lines = Object.entries(counts).filter(([, n]) => n > 0);
    const total = lines.reduce((a, [, n]) => a + n, 0);
    $('#bp-total').textContent = total + (total === 1 ? ' core garment' : ' core garments');
    $('#bp-list').innerHTML = lines.map(([k, n]) => `<li><b>${n}&times;</b>${k}${n > 1 && k !== 'Bespoke Suit' ? 's' : n > 1 ? 's' : ''}</li>`).join('') || '<li>Add a garment to begin</li>';
    const notes = ['Capsule Wardrobe Blueprint:', lines.map(([k, n]) => `${n} ${k}${n > 1 ? 's' : ''}`).join(', ')];
    if (direction) notes.push('Direction: ' + direction);
    const f = $('#bp-for').value, w = $('#bp-when').value;
    if (f) notes.push('Dressing for: ' + f);
    if (w) notes.push('Needed: ' + w);
    $('#bp-book').href = 'https://summitcustomsuits.com/book?occasion=' + encodeURIComponent('Capsule Wardrobe') + '&notes=' + encodeURIComponent(notes.join('\n'));
    $('#bp-book').classList.toggle('off', total === 0);
  };
  document.querySelectorAll('.stepper').forEach(st => {
    st.querySelector('.minus').addEventListener('click', () => { counts[st.dataset.k] = Math.max(0, counts[st.dataset.k] - 1); render(); });
    st.querySelector('.plus').addEventListener('click', () => { counts[st.dataset.k] = Math.min(9, counts[st.dataset.k] + 1); render(); });
  });
  document.querySelectorAll('.dir').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    document.querySelectorAll('.dir').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', on); direction = on ? b.dataset.d : ''; render();
  }));
  $('#bp-for').addEventListener('change', render); $('#bp-when').addEventListener('change', render);
  render();
})();
</script>'''
def stepper(k, note):
    return f'''<div class="stepper" data-k="{k}"><div><b>{k}</b><span>{note}</span></div>
      <div class="ctl"><button class="minus" type="button" aria-label="Fewer: {k}">&minus;</button><output aria-live="polite"></output><button class="plus" type="button" aria-label="More: {k}">+</button></div></div>'''
built.append(page('capsule-wardrobe',
  'Build a Capsule Wardrobe | Custom Suits & Shirts | Summit Customs',
  'Plan a capsule wardrobe of custom suits, sport coats, tuxedos and shirts that work together. Build your blueprint online, then refine it with Kobe in Salt Lake City.',
  [('Capsule Wardrobe', '/capsule-wardrobe')],
  hero([('Capsule Wardrobe', '/capsule-wardrobe')], 'The Capsule Wardrobe', 'Every piece should<br><em>earn its place.</em>',
       'Build a considered foundation of bespoke pieces chosen around your work, your occasions, and the way you want to show up.',
       img('shirt-paisley', 'Custom blue floral shirt on a tailor\'s dress form', 640, 853, eager=True),
       [('Build Your Capsule', '#builder', 'fill'), ('Call (801) 866-9718', 'tel:+18018669718', '')]) +
  f'''
<section class="sec builder" id="builder" aria-labelledby="cb-h">
  {heads('Your Blueprint', 'Shape your<br><em>foundation.</em>', 'Choose a direction and the pieces you want to start with. Your blueprint goes with you into the consultation, where you and Kobe refine the cloths, weights, and details.')}
  <div class="cb">
    <div class="cb-l rv">
      <h3 id="cb-h">Select a direction</h3>
      <div class="dirs">
        <button class="dir" type="button" aria-pressed="false" data-d="The Executive"><b>The Executive</b><span>Built for environments where formality is the baseline.</span></button>
        <button class="dir" type="button" aria-pressed="false" data-d="The Versatilist"><b>The Versatilist</b><span>Adaptive pieces that move easily from meetings to evenings.</span></button>
        <button class="dir" type="button" aria-pressed="false" data-d="The Complete Foundation"><b>The Complete Foundation</b><span>A balanced foundation for professional and formal occasions.</span></button>
      </div>
      <h3>Choose your pieces</h3>
      {stepper('Bespoke Suit', 'Two or three piece')}
      {stepper('Sport Coat', 'Built to stand alone')}
      {stepper('Tuxedo', 'For black-tie occasions')}
      {stepper('Custom Shirt', 'Cut to your measurements')}
      <div class="cb-q">
        <label>What are you dressing for?<select id="bp-for"><option value="">Choose one</option><option>Work and the boardroom</option><option>A wedding or event</option><option>Black-tie occasions</option><option>Travel</option><option>Everyday wear</option></select></label>
        <label>When do you need these pieces?<select id="bp-when"><option value="">Choose one</option><option>Within 2 months</option><option>In 2 to 4 months</option><option>No fixed date</option></select></label>
      </div>
    </div>
    <aside class="cb-r rv" aria-live="polite">
      <div class="eyebrow">Your Capsule Blueprint</div>
      <p class="bp-total" id="bp-total"></p>
      <ul class="bp-list" id="bp-list"></ul>
      <p>This blueprint is your starting point. During your consultation, you and Kobe can refine the cloths, weights, and details so each piece works naturally with the rest.</p>
      <a class="btn fill" id="bp-book" href="{book('Capsule Wardrobe')}">Discuss This Blueprint</a>
    </aside>
  </div>
</section>

<section class="sec">
  {feats([('1', 'Make Mornings Easier', 'A deliberate starting point gives you fewer decisions and a clearer path to getting dressed.'),
          ('2', 'Create More Possibilities', 'Choose pieces with shared colours, textures, and proportions so your wardrobe feels connected.'),
          ('3', 'Keep It Personal', 'Build the capsule with Kobe around your measurements, preferences, and the occasions already on your calendar.')])}
</section>
''' + cta('A wardrobe designed<br><em>to work together.</em>', 'Start with the moments you dress for most, and build from there.', 'Capsule Wardrobe'),
  [webpage('capsule-wardrobe', 'WebPage', 'Capsule Wardrobe Builder')], CAPSULE_JS))

# Shoes -------------------------------------------------------------
SHOES = [
  ('patina-oxford', 'Patina Cap-Toe Oxford', 'Tobacco &amp; Olive Patina', 'Hand-burnished in tobacco and olive, this cap-toe Oxford is the intersection of restraint and character. The patina is applied by artisans; no two pairs are identical.', 'Full-Grain Calf', 'Leather with Rubber Inserts', 'oxfords patina'),
  ('patina-horsebit-loafer', 'Patina Horsebit Loafer', 'Amber &amp; Cognac Patina', 'A burnished amber and cognac patina over a classic horsebit silhouette. The gold hardware adds understated luxury, equally at home with tailored trousers or a relaxed summer suit.', 'Full-Grain Calf', 'Cognac Mixed Leather-Rubber', 'loafers patina'),
  ('cognac-derby', 'Cognac Patina Derby', 'Cognac Patina', 'An open-lace Derby cut on the Savile last: a sleek silhouette with a slight chisel toe. The cognac patina reads warm in natural light and almost bronze under evening lighting.', 'Full-Grain Calf', 'Marilyn Art Leather', 'oxfords patina'),
  ('bordeaux-wholecut', 'Bordeaux Whole-Cut Oxford', 'Bordeaux &amp; Black Patina', 'A single-piece whole-cut upper in deep bordeaux, fading to near-black at the edges. Brogue medallion punching at the toe adds texture without breaking the silhouette. The hand-engraved sole is a detail visible only to the wearer.', 'Full-Grain Calf', 'Hand-Engraved Leather', 'oxfords patina'),
  ('patina-full-brogue', 'Patina Full Brogue Oxford', 'Tobacco, Olive &amp; Cognac Patina', 'A full brogue wingtip in a three-tone tobacco, olive, and cognac patina. The broguing traces every panel of the shoe, making it the most expressive Oxford in the collection.', 'Full-Grain Calf', 'Leather with Rubber Heel', 'oxfords patina'),
  ('brown-double-monk', 'Double Monk Cap-Toe', 'Medium Brown Box Calf', 'Two silver buckle straps over a cap-toe silhouette on the Savile last. The medium brown box calf develops a mirror shine with wear: a dress shoe that earns personality over time.', 'Box Calf', 'Dark Red Leather with Rubber Dots', 'monks'),
  ('black-venetian-loafer', 'Black Venetian Loafer', 'Black', 'A clean-lined venetian loafer in pebble-grain calf: no hardware, no tassels, nothing to distract from the silhouette. The studded rubber sole makes it the most wearable shoe in the collection.', 'Pebble-Grain Calf', 'Rubber (Studded)', 'loafers'),
  ('black-tassel-loafer', 'Black Tassel Loafer', 'Black', 'The definitive black tassel loafer: smooth calf, leather sole, and a restrained silhouette that pairs with everything from charcoal flannel to summer linen.', 'Smooth Calf', 'Leather', 'loafers'),
  ('tobacco-tassel-loafer', 'Tobacco Patina Tassel Loafer', 'Tobacco &amp; Dark Brown Patina', 'Tobacco at the centre fading to a deep espresso at the edges, giving this tassel loafer a depth plain brown leather never achieves. Rich enough for evenings, relaxed enough for a smart-casual Friday.', 'Full-Grain Calf', 'Leather', 'loafers patina'),
  ('olive-penny-loafer', 'Olive Patina Penny Loafer', 'Olive &amp; Espresso Patina', 'An olive-to-espresso patina on a clean penny loafer silhouette. The colour shifts from khaki to near-black depending on the light, making it one of the most versatile shoes in the collection.', 'Full-Grain Calf', 'Leather with Rubber Heel', 'loafers patina'),
  ('tobacco-wholecut-oxford', 'Tobacco Patina Wholecut Oxford', 'Tobacco &amp; Espresso Patina', 'Cut from a single piece of leather with no visible seams, the wholecut is the most demanding Oxford to make and the most striking to wear. The patina deepens with brushing marks that catch the light.', 'Full-Grain Calf', 'Dark Leather with Toe Taps', 'oxfords patina'),
  ('black-captoe-oxford', 'Black Cap-Toe Oxford', 'Black', 'The most formal shoe in the collection and the one every wardrobe needs. A clean cap-toe line, closed lacing, and a leather sole. Pairs with a morning coat or a midnight navy suit.', 'Smooth Calf', 'Leather', 'oxfords'),
  ('tobacco-chelsea-boot', 'Tobacco Patina Chelsea Boot', 'Tobacco &amp; Espresso Patina', 'A Chelsea boot in a hand-burnished tobacco patina that darkens from warm amber at the ankle to near-black at the toe. Equally at home with tailored trousers or dark denim.', 'Full-Grain Calf', 'Leather with Rubber Toe', 'boots patina'),
  ('black-chelsea-boot', 'Black Chelsea Boot', 'Black', 'A clean, unadorned Chelsea in smooth black calf. The dark brown elastic panel is the only contrast. Resoleable, structured, and built to outlast a decade of weekly wear.', 'Smooth Calf', 'Leather', 'boots'),
]
def shoe_card(s):
    sid, name, col, desc, leather, sole, cats = s
    plain = html.unescape(name)
    views = ''.join(f'<button class="v" type="button" data-lb data-full="/img/shoes/{sid}-{v}.webp" data-cap="{plain} &middot; {v.title()}" aria-label="{plain}, {v} view"><img src="/img/shoes/{sid}-{v}.webp" width="120" height="120" loading="lazy" decoding="async" alt=""></button>' for v in ('front', 'rear', 'sole'))
    return f'''<article class="shoe-c rv" id="{sid}" data-cat="{cats}" data-lb-group>
    <figure data-lb data-full="/img/shoes/{sid}-front.webp" data-cap="{plain}"><img src="/img/shoes/{sid}-front.webp" width="900" height="900" loading="lazy" decoding="async" alt="{plain} in {html.unescape(col).lower()}, made-to-order bespoke shoe"></figure>
    <div class="shoe-b">
      <h3>{name}</h3><span class="shoe-col">{col}</span>
      <p>{desc}</p>
      <dl><div><dt>Construction</dt><dd>Goodyear Welted</dd></div><div><dt>Leather</dt><dd>{leather}</dd></div><div><dt>Sole</dt><dd>{sole}</dd></div></dl>
      <div class="views">{views}</div>
      <a class="more" href="{book('Bespoke Footwear', 'Footwear: ' + plain)}">Select this style</a>
    </div>
  </article>'''
SHOES_JS = r'''<script>
document.querySelectorAll('.filters button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
  const f = b.dataset.f;
  document.querySelectorAll('.shoe-c').forEach(c => { c.hidden = f !== 'all' && !c.dataset.cat.split(' ').includes(f); });
  ScrollTrigger.refresh();
}));
</script>'''
built.append(page('shoes',
  "Bespoke Men's Shoes: Patina Oxfords & Loafers | Summit Customs",
  'Made-to-order bespoke footwear to complete your Summit Customs suit: Goodyear-welted patina Oxfords, loafers, monks and Chelsea boots, made to your specifications.',
  [('Garments', '/services'), ('Footwear', '/shoes')],
  hero([('Garments', '/services'), ('Footwear', '/shoes')], 'The Footwear Edit', 'Made-to-order<br><em>bespoke footwear.</em>',
       'Every suit deserves a shoe that was made for it. Each pair is handcrafted to your specifications: last, leather, sole, and finish, arriving as the final note of a complete look.',
       '<img src="/img/shoes/patina-full-brogue-front.webp" width="900" height="900" fetchpriority="high" decoding="async" alt="Patina full brogue Oxford in tobacco, olive and cognac">',
       [('Browse the Collection', '#catalog', 'fill'), ('Call (801) 866-9718', 'tel:+18018669718', '')], 'light-media') +
  f'''
<section class="sec" id="catalog" aria-label="Footwear catalog">
  <div class="filters rv" role="group" aria-label="Filter shoes">
    <button type="button" data-f="all" aria-pressed="true">All</button><button type="button" data-f="oxfords" aria-pressed="false">Oxfords</button><button type="button" data-f="loafers" aria-pressed="false">Loafers</button><button type="button" data-f="monks" aria-pressed="false">Monks</button><button type="button" data-f="boots" aria-pressed="false">Boots</button><button type="button" data-f="patina" aria-pressed="false">Patina</button>
  </div>
  <div class="shoecat">{''.join(shoe_card(s) for s in SHOES)}</div>
  <p class="note rv">More styles are being curated and added regularly. Every pair is Goodyear welted and made to order.</p>
</section>
''' + cta('The final note of<br><em>a complete look.</em>', 'Pair your shoes with your next commission, or order them on their own. Every pair is made to your specifications.', 'Bespoke Footwear'),
  [webpage('shoes', 'CollectionPage', 'Bespoke Footwear'),
   {'@type': 'ItemList', 'name': 'Summit Customs bespoke footwear', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': html.unescape(s[1]), 'url': f'{SITE}/shoes#{s[0]}', 'image': f'{ASSET_HOST}/img/shoes/{s[0]}-front.webp'} for i, s in enumerate(SHOES)]}],
  SHOES_JS))

# Fabrics ----------------------------------------------------------
groups_html = ''.join(f'''<section class="fgroup rv" aria-labelledby="fg{i}">
    <div class="fg-h"><h3 id="fg{i}">{name}</h3><span>{mill} &middot; {len(codes)} cloths</span></div>
    <div class="swgrid dense">{''.join(swatch(c, mill) for c in codes)}</div>
  </section>''' for i, (name, mill, codes) in enumerate(FAB_GROUPS))
built.append(page('fabrics',
  'Suit Fabrics: 2026 Spring/Summer Cloth Catalog | Summit Customs',
  'Browse the Summit Customs 2026 Spring/Summer suit fabric catalog: Marlane, Angelico and Olimpias cloths from premium Italian mills, available for custom suits in Salt Lake City.',
  [('Garments', '/services'), ('Fabrics', '/fabrics')],
  hero([('Garments', '/services'), ('Fabrics', '/fabrics')], '2026 Spring / Summer', 'Select your<br><em>cloth.</em>',
       'Italian contemporary cloths from a premium mill selection, available for your next suit. Browse the current catalog, then confirm your selection with Kobe during your consultation.',
       None, [('Book a Consultation', book('Bespoke Suit'), 'fill'), ('See the Suits', '/suits', '')]) +
  f'''
<section class="sec fabcat" aria-label="Suit fabric catalog">
  {groups_html}
  <p class="note rv">Suit fabrics sourced from premium Italian mills. Availability subject to change. Book a consultation to confirm your selection. Our full library of 4,000+ cloths, including Dormeuil, Scabal, Vitale Barberis Canonico and Holland &amp; Sherry, is available in person.</p>
</section>
''' + cta('Feel the cloth<br><em>in person.</em>', 'Swatches only tell half the story. See and handle the cloth during your consultation.', 'Bespoke Suit'),
  [webpage('fabrics', 'CollectionPage', 'Suit Fabric Catalog')]))

# Gallery ----------------------------------------------------------
GAL = [('client-trio', 'Three Summit Customs clients in navy, charcoal and grey custom suits', 'Three commissions, one standard', 960),
       ('tan-fitting', 'Client trying on a custom tan suit during a fitting', 'Tan suit &middot; Fitting', 853),
       ('rooftop', 'Clients in custom tailoring in tan, beige and navy check on a rooftop terrace', 'Rooftop &middot; Finished pieces', 853),
       ('client-linings', 'Clients revealing the custom patterned linings inside their suit jackets', 'Custom linings', 960),
       ('plaid-coat', 'Client wearing a green plaid custom sport coat with navy trousers', 'Plaid sport coat', 1107),
       ('grey-suit', 'Client in a light grey custom suit on a balcony overlooking the mountains', 'Light grey suit', 853),
       ('suit', 'Kobe Apponsah fitting a client in a navy custom suit jacket', 'The fitting', 960),
       ('navy-blazer', 'Client in a navy custom jacket and pink shirt adjusting the lining', 'Navy jacket &middot; Detail', 960),
       ('kobe-event', 'Kobe Apponsah in a black tuxedo and western hat at an outdoor event with a guest', 'Black tie, outdoors', 853),
       ('tuxedo', 'Kobe Apponsah in a midnight navy peak lapel tuxedo', 'Midnight tuxedo', 960),
       ('sportcoat', 'Navy custom sport coat worn over a grey turtleneck', 'Sport coat', 960),
       ('shirt-paisley', "Custom blue floral shirt on a tailor's dress form", 'Custom shirt', 853)]
built.append(page('gallery',
  'Gallery: Custom Suits on Real Clients | Summit Customs Salt Lake City',
  'Real fittings, real finished pieces: custom suits, sport coats, tuxedos and shirts made by Summit Customs for clients in Salt Lake City.',
  [('Gallery', '/gallery')],
  hero([('Gallery', '/gallery')], 'The Work', 'Real fittings.<br><em>Real pieces.</em>',
       'A bespoke garment is only as good as it looks and feels when worn. These are genuine client commissions captured throughout the process: the fittings, the finished pieces, and the men who wear them.', None) +
  f'''
<section class="sec" aria-label="Photo gallery">
  <div class="gallery">{''.join(f'<figure class="rv">{img(n, a, 640, h, "(max-width:900px) 50vw, 25vw")}<figcaption>{c}</figcaption></figure>' for n, a, c, h in GAL)}</div>
</section>
''' + cta('Ready to define<br><em>your standard?</em>', 'Book a private conversation to discuss your goals, your lifestyle, and the impression you want to leave.'),
  [webpage('gallery', 'ImageGallery', 'Summit Customs Gallery', {'image': [f'{ASSET_HOST}/img/{n}-1100.webp' for n, *_ in GAL]})]))

# About ------------------------------------------------------------
built.append(page('about',
  'About Kobe Apponsah, Founder & Master Clothier | Summit Customs',
  "Meet Kobe Apponsah, founder of Summit Customs: Salt Lake City's bespoke tailor and image consultant, built for the man who refuses to compromise.",
  [('About', '/about')],
  hero([('About', '/about')], 'Our Story', 'The standard<br><em>we hold.</em>',
       'Summit Customs was built for men who understand that presence is power, and that how you show up determines how you\'re received.',
       img('kobe-tractor', 'Kobe Apponsah, founder of Summit Customs, in a black tuxedo beside a red vintage tractor', eager=True, big=1067)) +
  f'''
<section class="sec kobe" aria-labelledby="ab-h">
  <figure class="rv">{img('kobe-portrait', 'Portrait of Kobe Apponsah in a midnight tuxedo with satin peak lapels', 640, 336)}</figure>
  <div class="rv">
    <div class="eyebrow">The Founder</div>
    <h2 class="h2" id="ab-h">Kobe Apponsah</h2>
    <div class="role">Master Clothier &middot; Summit Customs</div>
    <blockquote>&ldquo;I don&rsquo;t believe in trends.<br><em>I believe in standards.</em>&rdquo;</blockquote>
    <p>My background in high-level sales taught me one thing quickly: the men who win the room don't just speak well; they look like they belong there before they say a word. That's where I come in.</p>
    <p>From custom suiting to wardrobe refinement, every detail is intentional. The fit. The fabric. The silhouette. Nothing is accidental.</p>
    <p class="big">This isn't about dressing better.<br><em>It's about being perceived differently.</em></p>
  </div>
</section>

<section class="sec promise" aria-labelledby="ab-ph">
  <div class="rv">
    <div class="eyebrow">Our Philosophy</div>
    <h2 class="quote" id="ab-ph">Dress like the man <em>you&rsquo;re becoming.</em></h2>
    <p class="lede">At Summit Customs, we believe that great style is never about fashion; it's about clarity. Clarity about who you are, where you're going, and how you want to be received in the world.</p>
    <p class="lede">We operate with the highest standards of discretion, craftsmanship, and personal attention. Our clientele are men who have achieved, or are actively building, extraordinary lives, and they deserve service that reflects that.</p>
  </div>
  <div class="pillars">
    <div class="pillar rv"><i>01</i><h3>No upselling</h3><p>The goal is to understand what you need, not to sell you the most.</p></div>
    <div class="pillar rv"><i>02</i><h3>No trends</h3><p>Standards over seasons: garments built to be worn for years.</p></div>
    <div class="pillar rv"><i>03</i><h3>No generic advice</h3><p>Deeply personal strategy built around you and the life you're living.</p></div>
    <div class="pillar rv"><i>04</i><h3>Direct access</h3><p>You work with Kobe from the first conversation to the final fitting.</p></div>
  </div>
</section>
''' + cta('Start with<br><em>a conversation.</em>', 'Thirty minutes, in person in Salt Lake City or by video. No pressure, just strategy.'),
  [webpage('about', 'AboutPage', 'About Kobe Apponsah', {'mainEntity': {'@id': SITE + '/#kobe'}}),
   {'@type': 'Person', '@id': SITE + '/#kobe', 'name': 'Kobe Apponsah', 'jobTitle': 'Founder & Master Clothier', 'worksFor': BIZ,
    'image': f'{ASSET_HOST}/img/kobe-tractor-1100.webp', 'url': SITE + '/about', 'sameAs': ['https://www.instagram.com/summitcustomsuits/']}]))

# Contact ----------------------------------------------------------
CONTACT_JS = r'''<script>
document.getElementById('cform').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = n => f.elements[n].value.trim();
  const body = [`Name: ${v('name')}`, `Email: ${v('email')}`, v('phone') && `Phone: ${v('phone')}`, `Service of interest: ${v('service')}`, '', v('message')].filter(x => x !== false && x !== '').join('\n');
  location.href = 'mailto:kobe@summitcustomsuits.com?subject=' + encodeURIComponent('Consultation enquiry: ' + v('service')) + '&body=' + encodeURIComponent(body);
  f.querySelector('.sent').hidden = false;
});
</script>'''
built.append(page('contact',
  'Contact Summit Customs | Custom Tailor, 215 S State St, Salt Lake City',
  'Contact Summit Customs at 215 S State St, Suite 575, Salt Lake City. Call (801) 866-9718 or email to request a private consultation for custom suits and tailoring.',
  [('Contact', '/contact')],
  hero([('Contact', '/contact')], 'Reach Out', 'Request a private<br><em>consultation.</em>',
       "Whether you have a question, want to learn more about a specific service, or are ready to begin, we'd love to hear from you.", None) +
  f'''
<section class="sec contact" aria-label="Contact details and form">
  <div class="c-info rv">
    <dl>
      <div><dt>Email</dt><dd><a href="mailto:kobe@summitcustomsuits.com">kobe@summitcustomsuits.com</a></dd></div>
      <div><dt>Phone</dt><dd><a href="tel:+18018669718">(801) 866-9718</a></dd></div>
      <div><dt>Atelier</dt><dd><a href="{GMAP}" target="_blank" rel="noopener">215 S State St, Suite 575<br>Salt Lake City, UT 84111</a></dd></div>
      <div><dt>Availability</dt><dd>By appointment only<br>Monday to Saturday, 10am to 6pm MST</dd></div>
      <div><dt>Response time</dt><dd>Within 24 hours</dd></div>
    </dl>
    <a class="gbadge" href="{GMAP}" target="_blank" rel="noopener"><span class="stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span><b>5.0 on Google</b><span>Read reviews</span></a>
    <div class="map"><iframe title="Map: Summit Customs, 215 S State St, Salt Lake City" src="https://www.google.com/maps?q={quote('Summit Custom Suits, 215 S State St Suite 575, Salt Lake City, UT 84111')}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
  </div>
  <div class="c-form rv">
    <div class="eyebrow">Prefer to book directly?</div>
    <a class="btn fill wide" href="{BOOK}">Schedule a Consultation</a>
    <h2 class="h3">Send a message</h2>
    <form id="cform">
      <label>Name<input name="name" autocomplete="name" required></label>
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>Phone <small>(optional)</small><input name="phone" type="tel" autocomplete="tel"></label>
      <label>Service of interest<select name="service"><option>Bespoke Suit</option><option>Sport Coat</option><option>Tuxedo</option><option>Dress Trouser</option><option>Overcoat</option><option>Not Sure Yet</option></select></label>
      <label>Message<textarea name="message" rows="5" required></textarea></label>
      <button class="btn fill" type="submit">Send Message</button>
      <p class="hint">Opens your email app with your message ready to send to Kobe.</p>
      <p class="sent" hidden>Your email app should now be open. If it isn't, email <a href="mailto:kobe@summitcustomsuits.com">kobe@summitcustomsuits.com</a> directly.</p>
    </form>
  </div>
</section>''',
  [webpage('contact', 'ContactPage', 'Contact Summit Customs')], CONTACT_JS))

# Privacy ----------------------------------------------------------
built.append(page('privacy',
  'Privacy Policy | Summit Customs',
  'How Summit Customs collects, uses, and protects your personal information when you book a consultation or contact us.',
  [('Privacy', '/privacy')],
  hero([('Privacy', '/privacy')], 'Legal', 'Privacy<br><em>policy.</em>', 'Last updated: April 2026', None, []) + '''
<section class="sec prose">
  <h2>Overview</h2>
  <p>Summit Customs ("we," "us," or "our") is committed to protecting your personal information. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information when you use our website or book a consultation.</p>
  <h2>Information we collect</h2>
  <p>When you book a consultation or contact us, we may collect:</p>
  <ul><li>Your full name</li><li>Email address</li><li>Phone number</li><li>Preferred consultation date and time</li><li>Any notes or details you share in your message</li></ul>
  <h2>How we use your information</h2>
  <p>Your information is used solely to:</p>
  <ul><li>Schedule and confirm your consultation appointment</li><li>Send you booking confirmations and reminders via email</li><li>Follow up regarding your consultation or services</li><li>Respond to inquiries submitted through our contact form</li></ul>
  <h2>Third-party services</h2>
  <p>We use the following third-party services to operate our booking and communication systems:</p>
  <ul><li>Google Calendar, used to schedule and manage consultation appointments. Your booking details are added to a private business calendar.</li><li>EmailJS, used to send booking confirmation emails. Your name and email are transmitted securely to deliver these notifications.</li></ul>
  <h2>Data retention</h2>
  <p>We retain your information only for as long as necessary to fulfill the purpose for which it was collected, primarily to manage your consultation and any ongoing service relationship. You may request deletion of your data at any time.</p>
  <h2>We do not sell your data</h2>
  <p>Summit Customs does not sell, rent, trade, or share your personal information with any third parties for marketing purposes. Your information is used exclusively to serve you as a client.</p>
  <h2>Your rights</h2>
  <p>You have the right to:</p>
  <ul><li>Request access to the personal data we hold about you</li><li>Request correction of any inaccurate information</li><li>Request deletion of your personal data</li><li>Opt out of any future communications at any time</li></ul>
  <h2>Contact us</h2>
  <p>If you have any questions about this Privacy Policy or how your information is handled, please reach out: <a href="mailto:kobe@summitcustomsuits.com">kobe@summitcustomsuits.com</a> &middot; <a href="tel:+18018669718">(801) 866-9718</a></p>
</section>''',
  [webpage('privacy', 'WebPage', 'Privacy Policy')]))

# 404 --------------------------------------------------------------
doc = head('404', 'Page Not Found | Summit Customs', 'This page could not be found. Explore custom suits, sport coats and tuxedos from Summit Customs in Salt Lake City.', []).replace(
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">', '<meta name="robots" content="noindex">')
doc += header('') + '\n<main id="main">\n' + hero([], 'Page Not Found', 'This page has<br><em>been retired.</em>',
    "The page you're looking for isn't here. Start from the home page, or explore the garments below.", None,
    [('Back to Home', '/', 'fill'), ('Custom Suits', '/suits', ''), ('Contact', '/contact', '')]) + '\n</main>\n\n' + FOOTER + '\n\n' + SCRIPTS + '\n</body>\n</html>\n'
open(os.path.join(OUT, '404.html'), 'w').write(doc)

# ------------------------------------------------------------------ home page: shared chrome + internal links
HOME = os.path.join(OUT, 'index.html')
h = open(HOME).read()
h = re.sub(r'<header class="nav" id="nav">.*?<div class="progress" aria-hidden="true"><i></i></div>', lambda m: header('/'), h, count=1, flags=re.S)
h = re.sub(r'<footer>.*?</footer>\s*<div class="mbar">.*?</div>\s*<div class="lb".*?</div>', lambda m: FOOTER, h, count=1, flags=re.S)
INTERNAL = ['suits', 'sport-coats', 'tuxedos', 'shoes', 'fabrics', 'collection', 'capsule-wardrobe', 'services', 'gallery', 'about', 'contact', 'privacy']
for p in INTERNAL:
    h = h.replace(f'href="https://summitcustomsuits.com/{p}"', f'href="/{p}"')
h = re.sub(r'href="https://summitcustomsuits.com/shoes/([a-z-]+)"', r'href="/shoes#\1"', h)
open(HOME, 'w').write(h)

# ------------------------------------------------------------------ sitemap
urls = [('', '1.0')] + [(s, '0.9' if s in ('suits', 'services', 'collection') else '0.8' if s in ('sport-coats', 'tuxedos', 'about', 'contact') else '0.6') for s in built if s != 'privacy'] + [('privacy', '0.2')]
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for s, pr in urls:
    sm.append(f'  <url><loc>{SITE}/{s}</loc><lastmod>2026-10-23</lastmod><priority>{pr}</priority></url>')
sm.append('</urlset>')
open(os.path.join(OUT, 'sitemap.xml'), 'w').write('\n'.join(sm) + '\n')
print('built', ', '.join(built), '+ 404, index chrome, sitemap')
