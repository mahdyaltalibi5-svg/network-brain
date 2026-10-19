import Link from "next/link";
import { anatomy } from "@/content/anatomy";
import { fabrics } from "@/content/fabrics";
import { homeFaqs } from "@/content/faq";
import { occasions } from "@/content/occasions";
import { processSteps } from "@/content/process";
import { reviews } from "@/content/reviews";
import { LinkButton } from "@/components/ui/Button";
import { FaqList } from "@/components/ui/FaqList";
import { JacketArt } from "@/components/ui/JacketArt";
import { Ph, rich } from "@/components/ui/Rich";
import { Section } from "@/components/ui/Section";
import { ExplodedJacketArt, ProcessTrailArt, WovenSwatchArt } from "./scene-art";

export function HomeHero() {
  return (
    <section
      id="hero"
      data-scene="hero"
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] items-end overflow-hidden pt-28 pb-16 md:items-center md:pb-24"
    >
      {/* Resting jacket. The 3D particle jacket takes this slot in Phase 2. */}
      <div
        data-hero-art
        aria-hidden="true"
        className="pointer-events-none absolute top-[4.5rem] right-[-30%] flex h-[46svh] w-[90%] items-start justify-center opacity-[0.16] md:inset-y-0 md:top-0 md:right-[-4%] md:h-auto md:w-[52%] md:items-center md:opacity-90"
      >
        <JacketArt className="h-full w-auto max-w-[560px] md:h-auto md:w-full" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,rgb(201_164_92/0.10),transparent_60%)]"
      />

      <div className="container-site relative">
        <p className="eyebrow">Summit Customs · Salt Lake City</p>
        <h1
          id="hero-title"
          className="mt-8 max-w-[14ch] text-[clamp(3.2rem,9vw,8.4rem)] leading-[0.92] text-ivory"
        >
          Bespoke Suits &amp; Image Consulting <em className="text-gold not-italic md:italic">in Salt Lake City</em>
        </h1>
        <p className="mt-10 max-w-xl text-[clamp(1.05rem,1.5vw,1.25rem)] leading-relaxed text-ivory-dim">
          Summit Customs is a private studio for professionals who are judged on presence. Every suit is
          cut from your own pattern and refined over multiple fittings, then paired with the image
          strategy to wear it with intent.
        </p>
        <div className="mt-12 flex flex-wrap gap-4">
          <LinkButton href="/book">Book a Private Fitting</LinkButton>
          <LinkButton href="/bespoke-suits" variant="ghost">
            The Bespoke Suit
          </LinkButton>
        </div>
        <ul className="mt-16 flex flex-wrap gap-x-10 gap-y-3 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-ivory-dim">
          <li>Individual paper pattern</li>
          <li>Multiple fittings</li>
          <li>Serving the Wasatch Front</li>
        </ul>
      </div>
    </section>
  );
}

export function ProcessSection() {
  return (
    <Section
      id="process"
      eyebrow="The Process"
      title={
        <>
          Five steps from first conversation to <em>final fitting</em>.
        </>
      }
      intro={
        <p>
          A bespoke suit is built in stages and checked on your body between them. Across the trade, the
          whole ascent typically takes 6–12 weeks. <Link className="text-gold-bright underline underline-offset-4" href="/process">See the full process</Link>.
        </p>
      }
    >
      {/* Desktop: this stage pins while the five camps light up in turn */}
      <div data-process-stage className="grid gap-12 lg:min-h-[100svh] lg:grid-cols-12 lg:items-center lg:py-16">
        <ol data-scene="process" className="border-t border-line-soft lg:col-span-5">
          {processSteps.map((s) => (
            <li key={s.slug} data-camp={s.n} className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-b border-line-soft py-6 lg:py-5">
              <span className="font-display text-4xl leading-none text-gold">{String(s.n).padStart(2, "0")}</span>
              <div>
                <h3 className="font-display text-3xl leading-tight text-ivory">{s.name}</h3>
                <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone">{rich(s.duration)}</p>
                <p className="mt-3 max-w-md text-[0.95rem] text-ivory-dim">{rich(s.summary)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="hidden justify-center lg:col-span-6 lg:col-start-7 lg:flex">
          <ProcessTrailArt />
        </div>
      </div>
    </Section>
  );
}

export function AnatomySection() {
  return (
    <Section
      id="anatomy"
      eyebrow="Anatomy of the Suit"
      title={
        <>
          What you are paying for is <em>mostly invisible</em>.
        </>
      }
      intro={
        <p>
          The difference between a good suit and a great one sits under the cloth: the canvas, the
          shoulder, the hand work. Here is what to look for in any jacket, ours included.
        </p>
      }
    >
      <div className="grid gap-16 lg:grid-cols-12">
        {/* the exploded 3D jacket (or its static drawing) occupies this column */}
        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28">
            <ExplodedJacketArt />
          </div>
        </div>
        <dl data-scene="anatomy" className="grid gap-x-12 gap-y-14 sm:grid-cols-2 lg:col-span-7">
          {anatomy.map((p, i) => (
            <div key={p.id} data-layer={p.id}>
              <dt>
                <span className="eyebrow !text-stone">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-3 block font-display text-3xl text-ivory">{p.name}</span>
                <span className="mt-1 block text-gold-bright">{p.fact}</span>
              </dt>
              <dd className="mt-4 text-ivory-dim">{p.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

export function FabricSection() {
  return (
    <Section
      id="fabrics"
      eyebrow="Fabrics"
      title={
        <>
          Cloth for altitude, season <em>and the way you work</em>.
        </>
      }
      intro={
        <p>
          Salt Lake City runs hot and dry in summer and snowy in winter, so most wardrobes here need two
          weights. Choose by season, weight and wear. <Link className="text-gold-bright underline underline-offset-4" href="/fabrics">Read the fabric guide</Link>.
        </p>
      }
    >
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="hidden lg:col-span-5 lg:flex lg:items-start lg:justify-center">
          <div className="sticky top-40 w-full">
            <WovenSwatchArt />
          </div>
        </div>
        <ul data-scene="fabric" className="grid gap-px border border-line-soft bg-line-soft sm:grid-cols-2 lg:col-span-7">
          {fabrics.map((f) => (
            <li key={f.slug} data-fabric={f.slug} className="flex flex-col bg-void p-7">
              <p className="eyebrow">{f.season}</p>
              <h3 className="mt-5 font-display text-[1.75rem] leading-tight text-ivory">{f.name}</h3>
              <p className="mt-1 text-sm text-stone">{f.weight}</p>
              <p className="mt-4 flex-1 text-[0.95rem] text-ivory-dim">{f.character}</p>
              <p className="mt-5 border-t border-line-soft pt-3 text-sm text-ivory-dim">
                <span className="text-ivory">Mills:</span> {rich(f.mills)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function ImageConsultingSection() {
  const pillars = [
    ["Colour", "Which shades bring your complexion forward, and which ones drain it."],
    ["Proportion", "Cuts and lengths that correct and balance your frame."],
    ["Wardrobe audit", "Keep, tailor or retire. Every piece is judged against your calendar."],
    ["Presence", "Dress for boardrooms, stages, interviews and camera."],
  ] as const;
  return (
    <Section
      id="image-consulting"
      eyebrow="Image Consulting"
      title={
        <>
          The suit is the instrument. <em>Image is how you play it.</em>
        </>
      }
      intro={
        <p>
          Image consulting at Summit Customs pairs colour and proportion analysis with a wardrobe built to
          your pattern, so every recommendation can be made rather than hunted for.
        </p>
      }
    >
      <div className="grid gap-px border border-line-soft bg-line-soft sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map(([name, text]) => (
          <div key={name} className="bg-void p-8">
            <h3 className="font-display text-3xl text-ivory">{name}</h3>
            <p className="mt-4 text-ivory-dim">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-12">
        <LinkButton href="/image-consulting" variant="text">
          Explore image consulting
        </LinkButton>
      </div>
    </Section>
  );
}

export function OccasionsSection() {
  return (
    <Section
      id="occasions"
      eyebrow="Occasions"
      title={
        <>
          Business, wedding, executive. <em>Each with its own brief.</em>
        </>
      }
      className="bg-surface"
    >
      <ul className="grid gap-px border border-line-soft bg-line-soft md:grid-cols-3">
        {occasions.map((o, i) => (
          <li key={o.id} className="group flex flex-col bg-surface p-8 md:p-10">
            <span className="eyebrow">
              {String(i + 1).padStart(2, "0")} · {o.name}
            </span>
            <h3 className="mt-10 font-display text-4xl text-ivory md:min-h-[2.1em]">{o.title}</h3>
            <p className="mt-5 flex-1 text-ivory-dim">{o.body}</p>
            <Link href={o.href} className="mt-10 text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-gold hover:text-ivory">
              {o.linkLabel} <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function TestimonialsSection() {
  return (
    <Section
      id="testimonials"
      eyebrow="Clients"
      title={
        <>
          In their <em>own words</em>.
        </>
      }
    >
      {reviews.length > 0 ? (
        <ul className="grid gap-10 md:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.author}>
              <figure>
                <blockquote className="font-display text-2xl leading-snug text-ivory">“{r.body}”</blockquote>
                <figcaption className="mt-6 text-sm text-ivory-dim">
                  {r.author}
                  {r.role ? `, ${r.role}` : ""}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-10 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="border-t border-line pt-8">
              <figure>
                <blockquote className="font-display text-2xl leading-snug text-ivory">
                  <Ph>verified client testimonial {n} (with permission)</Ph>
                </blockquote>
                <figcaption className="mt-6 text-sm text-ivory-dim">
                  <Ph>client name or initials, role</Ph>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function HomeFaqSection() {
  return (
    <Section
      id="faq"
      eyebrow="Questions"
      title={
        <>
          What clients ask <em>before the first fitting</em>.
        </>
      }
      className="bg-surface"
    >
      <FaqList items={homeFaqs} />
      <div className="mt-12">
        <LinkButton href="/faq" variant="text">
          All questions
        </LinkButton>
      </div>
    </Section>
  );
}
