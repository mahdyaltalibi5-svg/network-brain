import Link from "next/link";
import { studio } from "@/content/business";
import { ComparisonTable } from "@/components/ui/ComparisonTable";
import { rich } from "@/components/ui/Rich";

export default function BespokeVsMtm() {
  return (
    <>
      <p>
        Three suits can hang side by side in navy worsted, each with two buttons and notch lapels, and
        still differ in price by a factor of ten. The label tells you very little. What you are paying
        for is mostly invisible: how the pattern was made, what is inside the jacket, and how many times
        a skilled person checked it on your body before it was finished.
      </p>
      <p>Here is what the three categories actually mean, and how to decide which one you need.</p>

      <h2 id="pattern">The pattern is the product</h2>
      <p>
        Every suit begins as a paper pattern, the flat shapes that are traced onto cloth and cut. The
        single most important question about any suit is <strong>whose pattern was it?</strong>
      </p>
      <ul>
        <li>An <strong>off-the-rack</strong> suit uses a standard pattern graded into sizes, such as 40R or 42L.</li>
        <li>A <strong>made-to-measure</strong> suit uses the same kind of standard pattern (a &ldquo;block&rdquo;), adjusted to your measurements.</li>
        <li>A <strong>bespoke</strong> suit uses a pattern drafted from nothing, for you alone.</li>
      </ul>
      <p>
        Everything else (price, timeline, how many fittings you need, how good it looks after five years)
        follows from that one difference.
      </p>

      <h2 id="off-the-rack">Off-the-rack: fast, affordable, built for an average</h2>
      <p>
        Ready-to-wear suits are cut for a statistical average body in each size. If you match the average,
        a good off-the-rack suit with sensible alterations can look sharp. The trouble is that very few
        people match it. Athletic builds, long torsos, sloping or square shoulders, or one shoulder lower
        than the other all fall outside the block.
      </p>
      <p>
        Alterations can shorten sleeves, hem trousers and take in a waist. They <strong>cannot</strong> fix
        the shoulder, the chest or the balance of the jacket (how the front and back hang relative to each
        other). Those are the things that make a suit look like it belongs to you.
      </p>
      <p>
        <strong>Typical timeline:</strong> same day, plus about a week for alterations.{" "}
        <strong>Typical US price:</strong> $200–$1,500.
      </p>

      <h2 id="made-to-measure">Made-to-measure: a better starting point</h2>
      <p>
        Made-to-measure (MTM) takes a factory block pattern and adjusts it: longer sleeves, a shorter
        jacket, more room in the seat. Often you choose from a menu of styles and cloths, and the
        garment is produced by a factory, typically abroad.
      </p>
      <p>
        Good MTM is a real step up from off-the-rack, especially for people who are simply longer or
        shorter than standard. Its limit is the block. Adjustments are made to a shape designed for
        someone else, so complex posture issues are approximated rather than solved. Most MTM programmes
        include a single fitting when the finished garment arrives, with alterations from there.
      </p>
      <p>
        <strong>Typical timeline:</strong> 3–6 weeks. <strong>Typical US price:</strong> $800–$2,500.
      </p>

      <h2 id="bespoke">Bespoke: a pattern that belongs to you</h2>
      <p>
        The word comes from the old Savile Row practice of a cloth being &ldquo;spoken for&rdquo; by a
        particular customer. A bespoke tailor measures you, studies your posture and drafts a pattern from
        a blank sheet. The suit is cut and loosely basted together, then fitted on your body. It is often
        taken apart, recut and fitted again.
      </p>
      <p>The trade standard is three fittings:</p>
      <ol>
        <li><strong>Baste fitting:</strong> the jacket is tacked together with white thread and has no finished edges. Shape and balance are corrected here.</li>
        <li><strong>Forward fitting:</strong> the sleeves and collar are set and the shape is confirmed.</li>
        <li><strong>Final fitting:</strong> details, sleeve length and trouser break, before the last pressing.</li>
      </ol>
      <p>
        Because the pattern is yours, it is kept on file. The second suit starts from a proven fit, and is
        often faster.
      </p>
      <p>
        <strong>Typical timeline:</strong> 6–12 weeks. <strong>Typical US price:</strong> $3,000–$8,000 and
        up, depending on cloth and hand work.
      </p>

      <h2 id="construction">Inside the jacket: canvas, fused and the hours you can&rsquo;t see</h2>
      <p>
        Between the outer cloth and the lining sits the jacket&rsquo;s structure. How it is built is the
        second-largest driver of price, after the pattern.
      </p>
      <ul>
        <li>
          <strong>Fused:</strong> an adhesive interlining is heat-bonded to the cloth. It is fast and
          inexpensive, and it can produce a flat, slightly stiff front that may blister after repeated dry
          cleaning.
        </li>
        <li>
          <strong>Half canvas:</strong> a floating wool–horsehair canvas runs through the chest and lapel,
          with a fused lower front. It is a sound middle ground and common in better MTM.
        </li>
        <li>
          <strong>Full canvas:</strong> the canvas runs the full length of the front and is attached with
          thousands of small stitches. It moulds to your chest with wear and lets the lapel roll naturally.
          It is standard in traditional bespoke.
        </li>
      </ul>
      <p>
        Add hand-padded lapels, a hand-set collar and hand-sewn buttonholes, and a traditional bespoke
        jacket can carry dozens of hours of skilled hand work. That labour is most of what the price buys.
      </p>

      <h2 id="comparison">Side by side</h2>
      <ComparisonTable caption="Typical figures across the US market. Individual makers vary." />

      <h2 id="value">Price versus cost per wear</h2>
      <p>
        Sticker price is the wrong number to compare. What matters is cost per wear. Suppose a
        well-made bespoke suit is worn twice a week for eight years and rotated with other suits. That
        is roughly 800 wears. A fused off-the-rack suit worn the same way often shows its age within two
        or three years: a bubbling chest, shiny seat, collapsed shoulder. It has to be replaced, and the
        replacement is altered again.
      </p>
      <p>
        Bespoke also keeps its value through change. Traditional bespoke trousers and jackets are built
        with generous <strong>inlays</strong>, extra cloth folded into the seams, so they can be let out
        or taken in when your body changes. Mass-produced garments rarely have more than a sliver of
        seam allowance.
      </p>
      <p>
        None of this makes bespoke the right answer for everyone. For a suit you&rsquo;ll wear a handful of
        times, a good off-the-rack suit with careful alterations is sensible. For the suits that carry your
        working life, the arithmetic usually favours building them properly once.
      </p>

      <h2 id="red-flags">When &ldquo;bespoke&rdquo; isn&rsquo;t bespoke</h2>
      <p>
        In the United States, &ldquo;bespoke&rdquo; is not a protected term. Plenty of made-to-measure
        programmes use it in their marketing. Five questions sort one from the other:
      </p>
      <ol>
        <li><strong>Is my pattern drafted from scratch, or adjusted from a block?</strong> Only the first is bespoke.</li>
        <li><strong>Will there be a baste fitting?</strong> A garment tacked together for fitting before it is finished is the hallmark of bespoke.</li>
        <li><strong>How many fittings are included?</strong> One fitting at the end is the made-to-measure model.</li>
        <li><strong>What is the construction?</strong> Ask directly whether the front is full canvas, half canvas or fused.</li>
        <li><strong>Who cuts, and where is it made?</strong> Knowing who drafts your pattern and where the garment is sewn tells you a great deal.</li>
      </ol>
      <p>
        A good maker, bespoke or made-to-measure, will answer all five plainly. Neither is a lesser
        product when it&rsquo;s sold honestly. They are simply different.
      </p>

      <h2 id="choosing">How to choose</h2>
      <p>Ask three questions:</p>
      <ol>
        <li>
          <strong>How often will you wear it?</strong> A suit worn three days a week for years justifies
          bespoke construction. One worn twice a year may not.
        </li>
        <li>
          <strong>How standard is your build?</strong> If off-the-rack jackets always fail at the
          shoulder or chest, MTM will help a little and bespoke will help a lot.
        </li>
        <li>
          <strong>What is the suit for?</strong> For a wedding, a trial or a public role, being seen at
          your best for hours is worth the investment.
        </li>
      </ol>
      <p>
        Summit Customs specialises in bespoke. Starting prices are {rich(studio.bespokeFrom)}.
        See <Link href="/bespoke-suits">what every bespoke commission includes</Link>, or{" "}
        <Link href="/book">book a private fitting</Link> to talk it through. There is no obligation to
        commission.
      </p>
    </>
  );
}
