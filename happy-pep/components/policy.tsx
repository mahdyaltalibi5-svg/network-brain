import { Smile } from "./smile";

export function Policy({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <section className="pb-20 pt-10 md:pt-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <Smile className="mt-2 w-20" width={10} />
        {updated && <p className="mt-2 text-sm text-pep-ink/50">Last updated {updated}</p>}
        <div className="mt-8 space-y-5 leading-relaxed text-pep-ink/80 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-pep-ink [&_li]:ml-5 [&_li]:list-disc [&_a]:text-pep-blue [&_a]:underline">
          {children}
        </div>
      </div>
    </section>
  );
}
