import type { ReactNode } from "react";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "section" | "div";
  titleId?: string;
  headingLevel?: 2 | 3;
};

/** Editorial section: eyebrow, hairline, display H2, intro. */
export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  className = "",
  as: Tag = "section",
  headingLevel = 2,
}: SectionProps) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag id={id} aria-labelledby={title ? headingId : undefined} className={`py-24 md:py-36 ${className}`}>
      <div className="container-site">
        {(eyebrow || title) && (
          <header className="mb-14 grid gap-6 md:mb-20 md:grid-cols-12">
            <div className="md:col-span-4">
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <div className="hairline mt-4 w-24" />
            </div>
            <div className="md:col-span-8">
              {title && (
                <H id={headingId} className="text-[clamp(2.4rem,5.2vw,4.6rem)] text-ivory">
                  {title}
                </H>
              )}
              {intro && <div className="mt-6 max-w-2xl text-lg text-ivory-dim">{intro}</div>}
            </div>
          </header>
        )}
        {children}
      </div>
    </Tag>
  );
}
