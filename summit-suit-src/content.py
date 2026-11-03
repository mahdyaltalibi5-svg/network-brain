"""Long-form copy for the SEO pages: journal articles, FAQ, service areas.
Only facts already published by Summit Customs are stated as facts (5 to 8 week timeline,
complimentary consultation, 4,000+ cloths, pattern kept on file, in person or by video)."""

BOOK = 'https://summitcustomsuits.com/book'

# Journal articles: slug, h1 (html), meta title, meta description, lede, image, image alt, image height, keywords, body, faqs, related
ARTICLES = [
 dict(
  slug='how-much-does-a-custom-suit-cost',
  h1='What does a custom suit<br><em>actually cost?</em>',
  name='How Much Does a Custom Suit Cost in Salt Lake City?',
  title='How Much Does a Custom Suit Cost in SLC? | Summit Customs',
  desc='What drives the price of a custom suit in Salt Lake City: cloth, construction, fit and details. How to compare quotes, and what each Summit Customs tier includes.',
  lede='The honest answer is that it depends on four decisions. Here is what each one changes, so you can compare quotes properly and know what you are paying for.',
  img='client-trio', alt='Three clients in navy, charcoal and grey custom suits made by Summit Customs', ih=960,
  kw='custom suit cost Salt Lake City, price of a bespoke suit, made to measure suit price Utah',
  body='''
<p>Ask five tailors what a custom suit costs and you will hear five different numbers. That is not evasion. The price of a custom suit is the sum of a handful of choices, and two suits that look alike across a room can be built very differently. Once you know what those choices are, quotes become easy to compare.</p>

<h2>1. The cloth</h2>
<p>Cloth is usually the single largest variable. Wool is graded by the fineness of its fibre, written as a "Super" number. A Super 110s worsted is hard-wearing and forgiving; Super 150s to 180s is lighter, softer and drapes beautifully, but asks for more care. The mill matters too: a cloth from Dormeuil, Scabal, Loro Piana or Holland &amp; Sherry costs more than an unbranded equivalent because of the yarn, the finishing and the consistency from bolt to bolt.</p>
<p>At Summit Customs you choose from a library of more than 4,000 cloths, including <a href="/fabrics">a current seasonal catalog you can browse online</a>. Kobe will tell you plainly when a less expensive cloth is the better choice for how you will actually wear the suit.</p>

<h2>2. The construction</h2>
<p>Inside the front of every jacket is a layer that gives it shape. In a <b>fused</b> jacket that layer is glued; it is quick to make, but it can stiffen or bubble over time. A <b>half-canvas</b> jacket has a floating canvas through the chest and lapel, so the lapel rolls naturally and the chest moulds to you. A <b>full floating canvas</b> runs the length of the front. It takes the longest to make and is the reason a well-made suit looks better in year five than on day one.</p>

<h2>3. How the fit is created</h2>
<p>Off-the-rack suits are cut for an average body and then altered. Made-to-measure starts from a pattern adjusted to your measurements and posture. Fully bespoke means a pattern drafted from scratch for one person. Each step takes more skilled time, and time is what you are paying for. Read <a href="/journal/bespoke-vs-made-to-measure">bespoke vs made-to-measure</a> for the full difference.</p>

<h2>4. The details</h2>
<p>Linings, working sleeve buttons, a monogram, pick stitching, a waistcoat, a second pair of trousers: each adds work. None of them are required, and a good tailor will help you spend on the details people actually notice.</p>

<h2>How Summit Customs prices a suit</h2>
<p>Our <a href="/collection">Collection</a> groups these choices into three tiers so the decision stays simple:</p>
<ul>
<li><b>The Ascent</b>: a complete made-to-measure suit in Super 110s wool, wool-linen or a durable travel blend. Where most clients start.</li>
<li><b>The Summit</b>: the flagship. Super 120s to 130s, canvassed construction, Bemberg silk lining, and Ermenegildo Zegna cloths on request.</li>
<li><b>The Standard</b>: Super 150s to 180s, full floating canvas, Loro Piana or Scabal on request, and a custom silk lining.</li>
</ul>
<p>You get an exact price during your complimentary consultation, before you commit to anything. There is no obligation and no upselling: the goal is to understand what you need, not to sell you the most.</p>

<h2>How to compare custom suit quotes</h2>
<ul>
<li>Ask what the jacket front is made of: fused, half canvas or full canvas.</li>
<li>Ask which mill the cloth comes from, and its Super number and weight.</li>
<li>Ask how many fittings are included and who does them.</li>
<li>Ask whether your pattern is kept for reorders. At Summit Customs it is kept for life, so later orders are faster and need only one fitting.</li>
<li>Ask about the timeline. Ours is typically 5 to 8 weeks from consultation to final fitting.</li>
</ul>
<p>A cheaper suit that needs replacing in two years is not cheaper. Cost per wear is the number that matters.</p>
''',
  faqs=[('Is a custom suit worth it?', 'If you wear a suit regularly, yes. A suit cut to your measurements fits better than an altered off-the-rack suit, and canvassed construction lasts years longer, which lowers the cost per wear.'),
        ('How do I get a price from Summit Customs?', 'Book a complimentary 30-minute consultation in Salt Lake City or by video. You leave knowing exactly what your garment will look like and what it will cost before you commit.'),
        ('Does Summit Customs charge for the consultation?', 'No. The first consultation is complimentary and carries no obligation.')],
  related=['bespoke-vs-made-to-measure', 'first-custom-suit', 'suit-fabrics-for-utah'],
 ),
 dict(
  slug='bespoke-vs-made-to-measure',
  h1='Bespoke, made-to-measure<br><em>or off the rack?</em>',
  name='Bespoke vs Made-to-Measure vs Off-the-Rack Suits',
  title='Bespoke vs Made-to-Measure Suits, Explained | Summit Customs',
  desc='The real difference between bespoke, made-to-measure and off-the-rack suits: how each is cut, fitted and built, and which one makes sense for you.',
  lede='Three words that get used loosely. Here is what each one should mean, and the questions that reveal which one you are actually being offered.',
  img='suit', alt='Kobe Apponsah fitting a client in a navy custom suit jacket', ih=960,
  kw='bespoke vs made to measure, what is a bespoke suit, made to measure suit Salt Lake City',
  body='''
<h2>Off the rack</h2>
<p>Off-the-rack suits are made in standard sizes for an average body and sold ready to wear. A good alterations tailor can shorten sleeves, hem trousers and take in the waist, but some things cannot be changed: the shoulder, the chest, the jacket length and the balance between front and back. If those are wrong for your body, the suit will always look slightly borrowed.</p>

<h2>Made-to-measure</h2>
<p>Made-to-measure starts with an established pattern that is then adjusted to your measurements, posture and preferences: a sloping shoulder, a longer arm, a fuller seat. You choose the cloth, lining, lapel, pockets and buttons. Done well, made-to-measure solves the problems alterations cannot, at a lower cost and in less time than full bespoke. It is the right answer for most men buying their first custom suit.</p>

<h2>Bespoke</h2>
<p>Traditionally, bespoke means a pattern drafted from scratch for one person, with a series of fittings in which the garment is refined on your body. It offers the most control over fit and style and takes the most skilled time.</p>

<h2>What matters more than the label</h2>
<p>The words are used loosely across the industry, so ask about the process instead:</p>
<ul>
<li><b>Who takes your measurements, and who fits you?</b> At Summit Customs it is Kobe Apponsah, from the first conversation through the final fitting. You are never handed to a salesperson.</li>
<li><b>Is the pattern yours?</b> Your measurements, cloth choices and pattern are kept on file, so every future order starts where the last one left off and needs only one fitting.</li>
<li><b>How is the jacket built?</b> Fused, half canvas or full floating canvas. See <a href="/journal/how-much-does-a-custom-suit-cost">what drives the cost of a custom suit</a>.</li>
<li><b>How many fittings, and how long?</b> Our typical timeline is 5 to 8 weeks.</li>
</ul>

<h2>Which should you choose?</h2>
<p>If you wear a suit a few times a year and your build is close to standard sizing, a well-altered off-the-rack suit can be enough. If you wear tailoring every week, have a build that off-the-rack never quite fits, or need a garment for a day that matters, a custom suit pays for itself. Every tier in <a href="/collection">the Summit Customs Collection</a> is cut to your measurements; the tiers differ in cloth, construction and detail.</p>
''',
  faqs=[('Is made-to-measure the same as bespoke?', 'Not quite. Made-to-measure adjusts an established pattern to your body; traditional bespoke drafts a new pattern from scratch. Both are cut to your measurements, unlike off-the-rack.'),
        ('Can an alterations tailor make an off-the-rack suit fit perfectly?', 'Sleeves, hems and the waist can be altered. The shoulders, chest, jacket length and balance cannot be changed meaningfully, which is why custom suits fit differently.')],
  related=['how-much-does-a-custom-suit-cost', 'what-to-expect-at-your-first-fitting', 'first-custom-suit'],
 ),
 dict(
  slug='wedding-suit-timeline',
  h1='When to order<br><em>your wedding suit.</em>',
  name='Custom Wedding Suit Timeline: When to Order',
  title='When to Order a Custom Wedding Suit | Summit Customs',
  desc='A month-by-month timeline for a custom wedding suit or tuxedo in Salt Lake City, for grooms, groomsmen and fathers of the bride, so nothing is rushed.',
  lede='A custom suit takes 5 to 8 weeks to build. The wedding calendar fills faster than that. Here is the timeline we recommend so the suit is the one thing you never worry about.',
  img='rooftop', alt='Clients in custom suits in tan, beige and navy check on a rooftop terrace', ih=853,
  kw='custom wedding suit Salt Lake City, groom suit timeline, when to order wedding tuxedo, groomsmen suits Utah',
  body='''
<p>Our suits typically take 5 to 8 weeks from first consultation to final fitting. For a wedding we recommend starting earlier than that, because the weeks before a wedding have a way of disappearing, and because you want room for a final fitting close to the date.</p>

<h2>4 to 6 months out: the consultation</h2>
<p>Book a complimentary consultation, in person in Salt Lake City or by video. Bring what you know: the venue, the season, the time of day, the colour palette, and photos of anything you like. This is where the big decisions get made: suit or tuxedo, two-piece or three-piece, and how the groom should stand apart from the groomsmen.</p>

<h2>4 months out: cloth and details</h2>
<p>Choose the cloth. The season and setting should lead. A summer ceremony in the mountains calls for something lighter and more breathable than a winter evening reception downtown. Read <a href="/journal/suit-fabrics-for-utah">how to choose suit fabric for Utah</a>. Then decide the details people will see in photographs: lapel width, a waistcoat, the lining you reveal when the jacket comes off.</p>

<h2>3 months out: measurements and construction</h2>
<p>Final measurements are taken and your garment goes into construction. If groomsmen or family members are being dressed too, this is the latest point to have everyone measured, so all the pieces are made together.</p>

<h2>4 to 6 weeks out: fitting</h2>
<p>You try on something built entirely for you, and refinements are made. If your weight is likely to change before the wedding, tell us at the consultation so the timing of this fitting can be planned around it.</p>

<h2>1 to 2 weeks out: collection</h2>
<p>Final adjustments, collection, and a plan for the day: how to hang it, how to travel with it, and what to do if it rains.</p>

<h2>Short on time?</h2>
<p>Rush orders are available in select circumstances. Call <a href="tel:+18018669718">(801) 866-9718</a> and ask; the sooner you call, the more options there are.</p>

<h2>Suit or tuxedo?</h2>
<p>For an evening reception with a formal dress code, a tuxedo is correct, and a <a href="/tuxedos">bespoke tuxedo</a> is a garment you own for every black-tie event after the wedding. For daytime, outdoor and mountain weddings, a three-piece suit is a favourite: the waistcoat keeps the look sharp when the jacket comes off for the dancing.</p>
<p>See <a href="/wedding-suits">custom wedding suits at Summit Customs</a>.</p>
''',
  faqs=[('How far in advance should I order a custom wedding suit?', 'We recommend starting 4 to 6 months before the wedding. The suit itself typically takes 5 to 8 weeks, and the extra time leaves room for decisions, fittings and the unexpected.'),
        ('Can Summit Customs dress the groomsmen too?', 'Yes. Book a consultation for the wedding party and have everyone measured at least three months before the date so the pieces are made together.'),
        ('Do you offer rush wedding suits?', 'Rush orders are available in select circumstances. Call (801) 866-9718 as early as possible.')],
  related=['black-tie-guide', 'suit-fabrics-for-utah', 'what-to-expect-at-your-first-fitting'],
 ),
 dict(
  slug='suit-fabrics-for-utah',
  h1='Choosing cloth<br><em>for Utah.</em>',
  name="How to Choose Suit Fabric for Utah's Climate",
  title="How to Choose Suit Fabric for Utah's Climate | Summit Customs",
  desc="Hot dry summers, cold winters and big swings in between: how to choose suit fabric for Salt Lake City and Park City, from Super 110s worsted to wool-linen and flannel.",
  lede='Salt Lake City has hot, dry summers, cold winters, and days that change by thirty degrees between the morning meeting and the evening dinner. Your cloth should be chosen for that.',
  img='grey-suit', alt='Client in a light grey custom suit on a balcony overlooking the mountains', ih=853,
  kw='suit fabric for Utah, summer suit Salt Lake City, best wool for suits, four season suit',
  body='''
<h2>Start with a year-round worsted</h2>
<p>If you are buying one suit, make it a mid-weight worsted wool. Wool breathes, resists wrinkles, and handles a dry climate well. A Super 110s to 130s cloth is the sweet spot for most men: refined enough for a boardroom, durable enough for weekly wear. Navy and charcoal work in every season.</p>

<h2>For summer: open weaves and linen blends</h2>
<p>Utah summers are hot, but dry, so you need breathability more than moisture management. Look for lighter weights and open weaves. Wool-linen blends give the cool feel of linen with fewer wrinkles. Our 2026 Spring/Summer catalog includes an <a href="/fabrics">Angelico linen and wool range and an Olimpias summer corduroy</a>, alongside lightweight Marlane cloths.</p>

<h2>For winter: weight and texture</h2>
<p>For winter, choose heavier cloths: flannel, tweed and textured wools that hold warmth and look right with an overcoat. A <a href="/sport-coats">sport coat</a> in a bold winter texture is often a better buy than a second winter suit, because it works with trousers and denim too.</p>

<h2>For travel and long days: stretch and performance</h2>
<p>If you fly often, or wear your suit from morning to night, a cloth with natural stretch or a high-twist yarn recovers from creasing and moves with you. The Marlane Extender&reg; 4 Seasons and Vivo Stretch ranges in our catalog are built for exactly this.</p>

<h2>Colour and the mountain light</h2>
<p>Utah's high-altitude sun is bright and clear. Mid-blues, greys and earth tones look rich in it; very pale cloths can look washed out in photographs taken outdoors at midday. For evening, midnight navy reads deeper than black under artificial light.</p>

<h2>Understanding Super numbers</h2>
<p>The Super number measures fibre fineness, not quality on its own. Higher numbers (150s to 180s) feel softer and drape beautifully but are more delicate. Lower numbers (100s to 120s) are more durable. You don't need to know the difference before you arrive; that is Kobe's job. You just need to know how you want to feel when you wear it.</p>
''',
  faqs=[('What is the best suit fabric for summer in Salt Lake City?', 'A lightweight, open-weave wool or a wool-linen blend. Both breathe well in dry heat, and the wool content keeps wrinkles under control.'),
        ('What weight of suit should I buy first?', 'A mid-weight worsted wool, around Super 110s to 130s, in navy or charcoal. It works across most of the year in Utah.'),
        ('Can I see the fabrics before my consultation?', 'Yes. The current seasonal catalog is online at summitcustomsuits.com/fabrics, and the full library of 4,000+ cloths is available in person.')],
  related=['how-much-does-a-custom-suit-cost', 'first-custom-suit', 'how-to-care-for-a-custom-suit'],
 ),
 dict(
  slug='black-tie-guide',
  h1='Black tie in<br><em>Salt Lake City.</em>',
  name='Black Tie Guide: Should You Rent or Own a Tuxedo?',
  title='Black Tie Guide: Rent or Own a Tuxedo? | Summit Customs',
  desc='What black tie requires, how a tuxedo differs from a black suit, and when owning a custom tuxedo makes more sense than renting, from a Salt Lake City tailor.',
  lede='Galas, charity dinners, formal weddings. If black tie shows up on your calendar more than once a year, here is what the dress code really asks for, and why owning beats renting.',
  img='tuxedo', alt='Kobe Apponsah in a midnight navy peak lapel tuxedo', ih=960,
  kw='black tie dress code, rent or buy tuxedo, custom tuxedo Salt Lake City, midnight navy tuxedo',
  body='''
<h2>What black tie requires</h2>
<ul>
<li><b>A dinner jacket</b> (tuxedo jacket) in black or midnight navy, with a peak lapel or shawl collar faced in satin or grosgrain. Never a notch lapel.</li>
<li><b>Matching trousers</b> with a braid down the outside seam, worn with side adjusters or braces rather than a belt.</li>
<li><b>A white dress shirt</b> with a turn-down collar, and a black bow tie.</li>
<li><b>Black shoes</b>: patent or highly polished calf Oxfords. A <a href="/shoes">black cap-toe Oxford</a> is the classic choice.</li>
</ul>

<h2>A tuxedo is not a black suit</h2>
<p>A tuxedo is a different garment with its own rules of proportion, fabric and finish. The silk facings catch the light; the cloth, usually barathea wool, absorbs it. A black business suit with a bow tie reads as exactly that.</p>

<h2>Black or midnight navy?</h2>
<p>Black tie does not mandate black cloth. Midnight navy often appears blacker than black under artificial light, and it is a historic tradition that commands presence. It is the colour Kobe wears himself.</p>

<h2>Rent or own?</h2>
<p>A rental is cut for someone else and fitted with clips and compromises. If you attend black tie once in your life, rent. If it shows up every year (a gala, a firm dinner, a wedding season), a tuxedo cut to your measurements quickly costs less per wear than repeated rentals, and you never again wonder how it will fit. Your pattern stays on file, so if your build changes, a new one is simple.</p>

<h2>Black tie optional</h2>
<p>"Black tie optional" means a tuxedo is welcome, and a dark suit in navy or charcoal with a tie is acceptable. Owning a tuxedo makes the decision for you.</p>

<p>See <a href="/tuxedos">bespoke tuxedos at Summit Customs</a>.</p>
''',
  faqs=[('Can I wear a black suit to a black tie event?', 'It is not correct black tie. A tuxedo has silk-faced lapels and braided trousers; a black suit does not. At a "black tie optional" event a dark suit is acceptable.'),
        ('Is midnight navy acceptable for black tie?', 'Yes. Midnight navy is a traditional black-tie colour and often looks deeper than black under artificial light.'),
        ('Should I rent or buy a tuxedo?', 'If you attend black-tie events regularly, owning a tuxedo cut to your measurements costs less per wear than repeated rentals and always fits.')],
  related=['wedding-suit-timeline', 'how-to-care-for-a-custom-suit', 'how-much-does-a-custom-suit-cost'],
 ),
 dict(
  slug='what-to-expect-at-your-first-fitting',
  h1='Your first<br><em>consultation.</em>',
  name='What to Expect at Your First Custom Suit Consultation',
  title='Your First Custom Suit Consultation | Summit Customs',
  desc='What happens at a custom suit consultation and fitting at Summit Customs in Salt Lake City: how long it takes, what to bring, and what you decide on the day.',
  lede="Most men put off their first custom suit because they don't know what happens in the room. Here it is, step by step.",
  img='tan-fitting', alt='Client trying on a custom tan suit during a fitting at Summit Customs', ih=853,
  kw='custom suit consultation, suit fitting Salt Lake City, what to bring to a suit fitting',
  body='''
<h2>Before you arrive</h2>
<p>Book online or call <a href="tel:+18018669718">(801) 866-9718</a>. The first consultation is complimentary, takes about 30 minutes, and can be in person at 215 S State St, Suite 575, in downtown Salt Lake City, or by video. If you like, <a href="/capsule-wardrobe">build a capsule blueprint</a> first so you arrive with a starting point.</p>

<h2>What to bring</h2>
<ul>
<li>The shoes you plan to wear with the suit, so trouser length can be set correctly.</li>
<li>A shirt that fits you well.</li>
<li>Photos of suits or looks you like, and any you dislike.</li>
<li>Your calendar: the dates and occasions you are dressing for.</li>
</ul>

<h2>The conversation</h2>
<p>Nothing is measured until we understand the man being dressed. Kobe asks about your work, your week, the rooms you walk into and the impression you want to leave. This is also where you talk about budget, openly. There is no pressure and no upselling.</p>

<h2>The cloth</h2>
<p>You will see and handle cloth from a library of more than 4,000, from mills in England, Italy and Japan. Kobe narrows it to a handful that suit your climate, occasion and body. See <a href="/journal/suit-fabrics-for-utah">choosing cloth for Utah</a>.</p>

<h2>The measurements</h2>
<p>If you decide to proceed, your measurements and posture are recorded and your style choices confirmed: lapel, buttons, pockets, vents, lining. You leave knowing exactly what you ordered, what it will cost, and when it will be ready, typically 5 to 8 weeks.</p>

<h2>The fitting</h2>
<p>You try on something built entirely for you. Refinements are made so the garment looks right, feels right, and is ready for the moments ahead. Your pattern then stays on file for life, so reorders take half the time and need only one fitting.</p>
''',
  faqs=[('How long is the first consultation?', 'About 30 minutes, complimentary, in person in Salt Lake City or by video.'),
        ('Do I have to buy anything at the consultation?', 'No. The first consultation carries no obligation. You leave knowing what the garment would look like and cost, and decide from there.'),
        ('Can I do the consultation by video?', 'Yes. The first consultation can be held by video if you cannot make it to the Salt Lake City atelier.')],
  related=['first-custom-suit', 'bespoke-vs-made-to-measure', 'how-much-does-a-custom-suit-cost'],
 ),
 dict(
  slug='how-to-care-for-a-custom-suit',
  h1='Care for it,<br><em>and it lasts.</em>',
  name='How to Care for a Custom Suit',
  title='How to Care for a Custom Suit | Summit Customs',
  desc='Make a custom suit last for decades: how to hang, brush, steam, store and travel with tailoring, and why you should dry clean far less than you think.',
  lede='A well-made suit is built to last for years. Most of the damage comes from a handful of habits. Here is how to avoid them.',
  img='lapel', alt='Close-up of a black bespoke tuxedo with a silk lapel and white pocket square', ih=640,
  kw='how to care for a suit, how often to dry clean a suit, how to store a suit',
  body='''
<h2>Rest it between wears</h2>
<p>Wool recovers its shape when it rests. Give a suit at least a day off between wears; this is the single best reason to own more than one. Empty the pockets every time you take it off.</p>

<h2>Hang it properly</h2>
<p>Use a broad, shaped wooden hanger that fills the shoulder of the jacket, and hang trousers by the hem or folded over a padded bar. Wire hangers distort the shoulder within weeks. Leave space in the wardrobe so the cloth can breathe.</p>

<h2>Brush, don't wash</h2>
<p>A soft clothes brush removes dust and the grit that wears down fibres. Brush downward after each wear. Spot-clean small marks with a damp cloth.</p>

<h2>Dry clean rarely</h2>
<p>Dry cleaning chemicals and the pressing that follows are hard on cloth and canvas. Clean only for a stain or a noticeable smell, a few times a year at most for a suit in regular rotation. Between cleanings, steam to release wrinkles and freshen the cloth.</p>

<h2>Store it for the season</h2>
<p>For seasonal storage, use a breathable cotton garment bag, never plastic, and add cedar to deter moths. Make sure the suit is clean before storing it; moths are drawn to residue.</p>

<h2>Travel with it</h2>
<p>Fold the jacket inside out, shoulder into shoulder, and pack it on top. Hang it as soon as you arrive; a steamy bathroom will release most creases. Cloths with natural stretch, like those in our <a href="/fabrics">Extender&reg; and Vivo Stretch ranges</a>, recover fastest.</p>

<h2>Have it adjusted, not replaced</h2>
<p>If your build changes, a suit cut with generous inlays can often be adjusted. Because your pattern stays on file at Summit Customs, a replacement is straightforward when the time comes.</p>
''',
  faqs=[('How often should I dry clean a suit?', 'Rarely: only for stains or odours, a few times a year at most. Brush and steam between wears instead.'),
        ('What hanger is best for a suit?', 'A broad, shaped wooden hanger that supports the full width of the shoulder.')],
  related=['suit-fabrics-for-utah', 'black-tie-guide', 'first-custom-suit'],
 ),
 dict(
  slug='first-custom-suit',
  h1='Your first<br><em>custom suit.</em>',
  name='Your First Custom Suit: What to Choose',
  title='Your First Custom Suit: What to Choose | Summit Customs',
  desc='Buying your first custom suit? The colour, cloth, cut and details that work hardest, and the mistakes to avoid, from a Salt Lake City tailor.',
  lede='Your first custom suit should be the most useful garment you own. That means making the safe choices well, and saving the bold ones for suit two.',
  img='navy-blazer', alt='Client in a navy custom jacket and pink shirt adjusting the lining', ih=960,
  kw='first custom suit, what color suit to buy first, navy or charcoal suit',
  body='''
<h2>Colour: navy or charcoal</h2>
<p>Navy is the most versatile colour in tailoring. It works for interviews, weddings, client meetings and dinners, and pairs with brown or black shoes. Charcoal is a close second and slightly more formal. Save the windowpane check for later.</p>

<h2>Cloth: mid-weight worsted wool</h2>
<p>A mid-weight worsted, Super 110s to 130s, can be worn most of the year in Utah and stands up to weekly wear. Our <a href="/collection">Ascent tier</a> is built around exactly this kind of cloth and is where most clients start. See <a href="/journal/suit-fabrics-for-utah">choosing cloth for Utah</a>.</p>

<h2>Cut: two-piece, single-breasted, two buttons</h2>
<p>A single-breasted, two-button jacket with a notch lapel of moderate width is timeless. Flap pockets work for business and can be tucked in for evening. Add a waistcoat if you want the option of a three-piece for weddings.</p>

<h2>Details: keep the reveal inside</h2>
<p>Want personality? Put it in the lining. A bold lining is invisible in a meeting and memorable when the jacket comes off. It is one of our clients' favourite details; see <a href="/gallery">the gallery</a>.</p>

<h2>Mistakes to avoid</h2>
<ul>
<li>Choosing a trend lapel width or a very short jacket that will date quickly.</li>
<li>Choosing the finest, most delicate cloth for a suit you plan to wear every week.</li>
<li>Arriving without the shoes you will wear, so the trouser break cannot be set correctly.</li>
<li>Leaving it too late. Allow 5 to 8 weeks, and more for a wedding.</li>
</ul>

<h2>Then build from there</h2>
<p>Your pattern stays on file, so suit two is faster and needs only one fitting. Many clients plan a <a href="/capsule-wardrobe">capsule wardrobe</a>: a suit, a few sport coats and shirts that all work together.</p>
''',
  faqs=[('What colour should my first custom suit be?', 'Navy, followed by charcoal. Both work across business, weddings and evenings.'),
        ('Should my first suit be two-piece or three-piece?', 'A two-piece is the most versatile. Ordering a matching waistcoat gives you the three-piece option for weddings.')],
  related=['what-to-expect-at-your-first-fitting', 'how-much-does-a-custom-suit-cost', 'bespoke-vs-made-to-measure'],
 ),
]

# Service areas: slug-ish id, place name, drive note, copy
AREAS = [
 ('salt-lake-city', 'Salt Lake City', 'Downtown, our home', 'Our atelier is at 215 S State St, Suite 575, in the heart of downtown, a short walk from the City Creek, Main Street and the law and finance offices along State Street. Consultations are by appointment, Monday to Saturday.'),
 ('park-city', 'Park City', 'About 35 minutes via I-80', 'Park City clients come to us for mountain weddings, winter events and tailoring that works between the slopes and the boardroom. Ask about lighter cloths for summer ceremonies and textured winter jackets.'),
 ('lehi', 'Lehi &amp; Silicon Slopes', 'About 30 minutes via I-15', 'For founders and executives along Silicon Slopes, we build suits and sport coats for investor meetings, conferences and the dinners that follow. Video consultations make the first step easy around a busy schedule.'),
 ('provo', 'Provo &amp; Orem', 'About 45 minutes via I-15', 'From graduation and first-job suits to wedding parties, Utah County clients make the drive for a first consultation, and use video for follow-up conversations.'),
 ('sandy', 'Sandy, Draper &amp; South Jordan', 'About 20 to 25 minutes', 'South valley professionals, from the Draper tech corridor to Sandy, can reach the downtown atelier quickly on I-15 or TRAX.'),
 ('ogden', 'Ogden &amp; Layton', 'About 40 minutes via I-15', 'Northern Utah clients book for weddings, black-tie events and business wardrobes. Plan a single in-person consultation and handle details by video.'),
 ('bountiful', 'Bountiful &amp; Davis County', 'About 15 minutes', 'Just north of downtown, Bountiful and Davis County clients are minutes away from fittings.'),
 ('video', 'Outside Utah', 'By video', 'Your first consultation can be held by video. Once your pattern is on file, reorders need only one fitting.'),
]

# FAQ page: (section, [(q, a)])
FAQ = [
 ('Getting started', [
  ('Is the first consultation free?', 'Yes. Your first step is a complimentary 30-minute private consultation, in person in Salt Lake City or by video. The conversation is about your goals, your lifestyle and the impression you want to leave. There is no obligation.'),
  ('How do I book?', 'Book online at summitcustomsuits.com/book or call (801) 866-9718. Consultations are by appointment, Monday to Saturday, 10am to 6pm Mountain Time.'),
  ('Who will I work with?', 'You work directly with founder Kobe Apponsah from the first conversation through the final fitting. You are never handed off to a salesperson.'),
  ('Can I do the consultation by video?', 'Yes. The first consultation can be in person at our downtown Salt Lake City atelier or by video.'),
  ('What should I bring?', 'The shoes you plan to wear with the suit, a shirt that fits you well, photos of looks you like, and the dates you are dressing for.'),
 ]),
 ('Garments &amp; cloth', [
  ('What garments does Summit Customs make?', 'Two-piece and three-piece suits, sport coats and blazers, tuxedos and evening wear, dress trousers, overcoats and custom shirts, plus made-to-order Goodyear-welted footwear.'),
  ('What fabrics can I choose from?', 'A library of more than 4,000 cloths from mills in England, Italy and Japan, including Dormeuil, Scabal, Vitale Barberis Canonico and Holland &amp; Sherry. The current seasonal catalog is online at /fabrics.'),
  ('What is the difference between the three tiers?', 'The Ascent (Super 110s, where most clients start), The Summit (the flagship: Super 120s to 130s, canvassed, Bemberg silk lining) and The Standard (Super 150s to 180s, full floating canvas). Every tier is cut to your measurements.'),
  ('Do you make custom shirts?', 'Yes. Custom shirts are cut to your measurements and can be planned alongside a suit or as part of a capsule wardrobe.'),
  ('Do you make shoes?', 'Yes. Made-to-order, Goodyear-welted Oxfords, loafers, monks and Chelsea boots, many in hand-burnished patina finishes. See /shoes.'),
 ]),
 ('Timing &amp; fittings', [
  ('How long does a custom suit take?', 'Typically 5 to 8 weeks from first consultation to final fitting.'),
  ('Do you offer rush orders?', 'Rush orders are available in select circumstances. Ask when you book.'),
  ('Do you keep my measurements on file?', 'Yes. Your measurements, cloth choices and pattern are kept on file for life, so reorders take half the time and need only one fitting.'),
  ('How early should I order a wedding suit?', 'We recommend starting 4 to 6 months before the wedding, and having groomsmen measured at least three months before the date.'),
 ]),
 ('Pricing', [
  ('How much does a custom suit cost?', 'It depends on the cloth, construction and details you choose. You receive an exact price during your complimentary consultation, before committing to anything. See our guide to custom suit cost.'),
  ('Is there any pressure to buy?', 'No. The goal is to understand what you need, not to sell you the most. You leave the consultation knowing what your garment would look like and cost, and decide from there.'),
 ]),
 ('Visiting', [
  ('Where is Summit Customs?', '215 S State St, Suite 575, Salt Lake City, UT 84111, in downtown Salt Lake City.'),
  ('What are your hours?', 'By appointment, Monday to Saturday, 10am to 6pm Mountain Time.'),
  ('Do you serve clients outside Salt Lake City?', 'Yes. Clients come from Park City, Lehi, Provo, Sandy, Ogden and beyond, and consultations can also be held by video.'),
 ]),
]
