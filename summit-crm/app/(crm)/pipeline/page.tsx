import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarClock, Columns3, Download, List, Plus, Search } from "lucide-react";
import { Avatar, SourceBadge, StageBadge } from "@/components/Badges";
import { Board, type CardLead } from "@/components/Board";
import { ago, money } from "@/lib/format";
import { campaignNames, listLeads, SORTS } from "@/lib/leads";
import { isStage, stages } from "@/lib/stages";
import { createLeadAction } from "../actions";

export const metadata: Metadata = { title: "Pipeline" };

type Params = { q?: string; source?: string; campaign?: string; range?: string; sort?: string; view?: string; stage?: string };

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const view = sp.view === "list" || isStage(sp.stage) ? "list" : "board";
  const [all, campaigns] = await Promise.all([listLeads(sp), campaignNames()]);
  const leads = isStage(sp.stage) ? all.filter((l) => l.stage === sp.stage) : all;
  const filtered = !!(sp.q || sp.source || sp.campaign || sp.range || isStage(sp.stage));
  const now = new Date();
  const qs = (patch: Partial<Params>) => {
    const u = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/pipeline${u.size ? `?${u}` : ""}`;
  };
  const cards: CardLead[] = all.map((l) => ({
    id: l.id,
    name: l.fullName ?? l.email ?? l.phone ?? "Unnamed lead",
    occasion: l.occasion,
    source: l.source,
    stage: l.stage,
    valueCents: l.valueCents,
    leadCreatedAt: l.leadCreatedAt.toISOString(),
    contacted: !!l.firstContactAt,
    followUpAt: l.followUpAt?.toISOString() ?? null,
    eventDate: l.eventDate,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="mt-2 font-display text-5xl">Clients in motion</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass flex !rounded-full p-1" role="group" aria-label="View">
            <Link href={qs({ view: undefined, stage: undefined })} aria-current={view === "board" ? "page" : undefined} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${view === "board" ? "bg-white/10 text-gold-bright" : "text-ivory-dim"}`}>
              <Columns3 className="h-3.5 w-3.5" aria-hidden="true" /> Board
            </Link>
            <Link href={qs({ view: "list" })} aria-current={view === "list" ? "page" : undefined} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${view === "list" ? "bg-white/10 text-gold-bright" : "text-ivory-dim"}`}>
              <List className="h-3.5 w-3.5" aria-hidden="true" /> List
            </Link>
          </div>
          <Link href="/settings#import" className="btn-ghost"><Download className="h-3.5 w-3.5" aria-hidden="true" />Import from Meta</Link>
          <details className="relative">
            <summary className="btn cursor-pointer list-none"><Plus className="h-3.5 w-3.5" aria-hidden="true" />New lead</summary>
            <form action={createLeadAction} className="glass absolute right-0 z-30 mt-2 w-80 space-y-3 p-5">
              <div><label className="label" htmlFor="nl-name">Name</label><input id="nl-name" name="fullName" required className="field" /></div>
              <div><label className="label" htmlFor="nl-phone">Phone</label><input id="nl-phone" name="phone" type="tel" className="field" /></div>
              <div><label className="label" htmlFor="nl-email">Email</label><input id="nl-email" name="email" type="email" className="field" /></div>
              <div><label className="label" htmlFor="nl-occ">What for</label><input id="nl-occ" name="occasion" placeholder="Wedding, bespoke suit…" className="field" /></div>
              <button className="btn w-full">Add lead</button>
            </form>
          </details>
        </div>
      </div>

      {/* Filters: one row, applied with the Apply button (works without JavaScript) */}
      <form role="search" className="glass flex flex-wrap items-end gap-2 !rounded-[22px] p-3" aria-label="Filter leads">
        {view === "list" && <input type="hidden" name="view" value="list" />}
        <div className="relative min-w-[12rem] flex-1">
          <label htmlFor="q" className="sr-only">Search leads</label>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone" aria-hidden="true" />
          <input id="q" name="q" defaultValue={sp.q} placeholder="Search name, phone, email, campaign" className="field !pl-9" />
        </div>
        <div>
          <label htmlFor="f-source" className="label !mb-1">Source</label>
          <select id="f-source" name="source" defaultValue={sp.source ?? ""} className="field !w-36">
            <option value="">All sources</option><option value="meta">Meta ads</option><option value="website">Website</option><option value="manual">Added by hand</option>
          </select>
        </div>
        {campaigns.length > 0 && (
          <div>
            <label htmlFor="f-campaign" className="label !mb-1">Campaign</label>
            <select id="f-campaign" name="campaign" defaultValue={sp.campaign ?? ""} className="field !w-48">
              <option value="">All campaigns</option>
              {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="f-range" className="label !mb-1">Arrived</label>
          <select id="f-range" name="range" defaultValue={sp.range ?? ""} className="field !w-36">
            <option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-sort" className="label !mb-1">Sort</label>
          <select id="f-sort" name="sort" defaultValue={sp.sort ?? "activity"} className="field !w-40">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn-ghost">Apply</button>
        {filtered && <Link href={view === "list" ? "/pipeline?view=list" : "/pipeline"} className="pill hover:text-ivory">Clear</Link>}
      </form>
      {filtered && <p className="text-sm text-ivory-dim">{leads.length} lead{leads.length === 1 ? " matches" : "s match"}{isStage(sp.stage) ? ` in “${stages.find((s) => s.id === sp.stage)!.label}”` : ""}.</p>}

      {view === "board" ? (
        <Board key={cards.map((c) => c.id + c.stage).join()} leads={cards} now={now.getTime()} />
      ) : leads.length === 0 ? (
        <p className="tile text-sm text-ivory-dim">No leads match.</p>
      ) : (
        <>
          {/* phone: cards */}
          <ul className="space-y-2 md:hidden" data-testid="list">
            {leads.map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="tile lift flex items-center gap-3">
                  <Avatar name={l.fullName ?? "?"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.fullName ?? "Unnamed lead"}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5"><StageBadge stage={l.stage} /><SourceBadge source={l.source} short /></span>
                  </span>
                  {l.valueCents != null && <span className="text-sm text-gold-bright">{money(l.valueCents, { cents: true })}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {/* desktop: table */}
          <div className="card hidden overflow-x-auto p-2 md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Leads</caption>
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-stone">
                  {["Client", "Stage", "Source", "Campaign", "Value", "Follow-up", "Arrived"].map((h, i) => (
                    <th key={h} scope="col" className={`px-3 py-2.5 font-medium ${i === 4 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[.03]">
                    <th scope="row" className="px-3 py-2.5 text-left font-normal">
                      <Link href={`/leads/${l.id}`} className="flex items-center gap-3 hover:text-gold">
                        <Avatar name={l.fullName ?? "?"} size={30} />
                        <span><span className="block font-medium">{l.fullName ?? "Unnamed lead"}</span>{l.occasion && <span className="block text-xs text-stone">{l.occasion}</span>}</span>
                      </Link>
                    </th>
                    <td className="px-3"><StageBadge stage={l.stage} /></td>
                    <td className="px-3"><SourceBadge source={l.source} short /></td>
                    <td className="max-w-[14rem] truncate px-3 text-ivory-dim">{l.campaignName ?? "—"}</td>
                    <td className="px-3 text-right">{money(l.valueCents, { cents: true })}</td>
                    <td className="px-3 text-ivory-dim">
                      {l.followUpAt ? (
                        <span className={`inline-flex items-center gap-1 ${l.followUpAt < now ? "text-bad" : ""}`}><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{l.followUpAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 text-ivory-dim">{ago(l.leadCreatedAt, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
