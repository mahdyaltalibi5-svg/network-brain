import Link from "next/link";
import { connection } from "next/server";
import { StageSelect } from "@/components/StageSelect";
import { ago, money, sourceLabel } from "@/lib/format";
import { listLeads } from "@/lib/leads";
import { stages } from "@/lib/stages";
import { createLeadAction, moveLeadAction } from "./actions";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const { q } = await searchParams;
  const leads = await listLeads({ q });
  const now = new Date();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="mt-2 font-display text-4xl">Clients in motion</h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <form role="search" className="flex w-full gap-2 sm:w-auto">
            <label htmlFor="q" className="sr-only">
              Search leads
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Search name, email, phone, campaign" className="field min-w-0 flex-1 sm:!w-72 sm:flex-none" />
            <button className="btn-ghost">Search</button>
          </form>
          <details className="relative">
            <summary className="btn cursor-pointer list-none">+ New lead</summary>
            <form action={createLeadAction} className="card absolute right-0 z-20 mt-2 w-80 space-y-3 p-4 shadow-2xl">
              <div>
                <label className="label" htmlFor="nl-name">Name</label>
                <input id="nl-name" name="fullName" required className="field" />
              </div>
              <div>
                <label className="label" htmlFor="nl-phone">Phone</label>
                <input id="nl-phone" name="phone" type="tel" className="field" />
              </div>
              <div>
                <label className="label" htmlFor="nl-email">Email</label>
                <input id="nl-email" name="email" type="email" className="field" />
              </div>
              <div>
                <label className="label" htmlFor="nl-occ">What for</label>
                <input id="nl-occ" name="occasion" placeholder="Wedding, bespoke suit…" className="field" />
              </div>
              <button className="btn w-full">Add lead</button>
            </form>
          </details>
        </div>
      </div>

      {q && (
        <p className="mt-4 text-sm text-ivory-dim">
          {leads.length} match{leads.length === 1 ? "" : "es"} for “{q}”. <Link href="/" className="text-gold underline">Clear</Link>
        </p>
      )}

      <div className="relative mt-8 flex gap-4 overflow-x-auto pb-4" data-testid="board">
        {stages.map((s) => {
          const col = leads.filter((l) => l.stage === s.id);
          return (
            <section key={s.id} aria-labelledby={`col-${s.id}`} className="w-72 shrink-0" data-stage={s.id}>
              <header className="flex items-baseline justify-between border-b border-line pb-2">
                <h2 id={`col-${s.id}`} className="text-sm font-semibold">
                  {s.label}
                </h2>
                <span className="text-xs text-stone">{col.length}</span>
              </header>
              <p className="mt-2 text-xs text-stone">{s.hint}</p>
              <ul className="mt-3 space-y-2">
                {col.map((l) => (
                  <li key={l.id} className="card p-3" data-lead={l.id}>
                    <Link href={`/leads/${l.id}`} className="block font-medium hover:text-gold">
                      {l.fullName ?? l.email ?? l.phone ?? "Unnamed lead"}
                    </Link>
                    {l.occasion && <p className="mt-0.5 text-sm text-ivory-dim">{l.occasion}</p>}
                    <p className="mt-2 text-xs text-stone">
                      {sourceLabel[l.source]}
                      {l.campaignName ? ` · ${l.campaignName}` : ""} · {ago(l.leadCreatedAt, now)}
                    </p>
                    {l.valueCents != null && <p className="mt-1 text-xs text-gold">{money(l.valueCents, { cents: true })}</p>}
                    <div className="mt-3">
                      <StageSelect id={l.id} stage={l.stage} valueCents={l.valueCents} action={moveLeadAction} compact />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
