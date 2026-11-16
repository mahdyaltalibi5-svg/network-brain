import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, CalendarHeart, Clock3, PhoneCall, TrendingDown, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/Badges";
import { LeadsChart, ResponseChart, Sparkline } from "@/components/Charts";
import { kpis, leadsByDay, responseByWeek, stageSummary, upcomingEvents } from "@/lib/dashboard";
import { dueFollowUps } from "@/lib/followups";
import { money } from "@/lib/format";
import { formatMinutes, waitingLeads } from "@/lib/speed";
import { stages } from "@/lib/stages";
import { STAGE_COLOR } from "@/lib/ui";

export const metadata: Metadata = { title: "Home" };

function Delta({ now, prev, invert = false, suffix = "" }: { now: number | null; prev: number | null; invert?: boolean; suffix?: string }) {
  if (now == null || prev == null || (now === 0 && prev === 0)) return <span className="text-xs text-stone">no change yet</span>;
  const diff = now - prev;
  if (Math.abs(diff) < 0.5) return <span className="text-xs text-stone">same as before</span>;
  const good = invert ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${good ? "text-ok" : "text-bad"}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {diff > 0 ? "+" : "−"}{Math.abs(Math.round(diff))}{suffix} <span className="text-stone">vs previous</span>
    </span>
  );
}

const greet = () => {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Denver", hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default async function HomePage() {
  await connection();
  const [k, days, weeks, funnel, events, waiting, due] = await Promise.all([kpis(), leadsByDay(30), responseByWeek(8), stageSummary(), upcomingEvents(90), waitingLeads(), dueFollowUps()]);
  const open = funnel.filter((f) => !["delivered", "lost"].includes(f.stage));
  const maxCount = Math.max(1, ...open.map((f) => f.count));
  const pipelineValue = open.reduce((a, f) => a + f.valueCents, 0);
  const daily = days.map((d) => d.meta + d.website + d.manual);
  const now = [...waiting.map((l) => ({ l, why: "first reply" as const })), ...due.map((l) => ({ l, why: "follow-up" as const }))].slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{new Date().toLocaleDateString("en-US", { timeZone: "America/Denver", weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-2 font-display text-5xl md:text-6xl">{greet()}, Kobe</h1>
        <p className="mt-2 text-ivory-dim">
          {k.waiting + k.followUpsDue === 0 ? "Nothing needs you right now." : (
            <>
              <span className="text-ivory">{k.waiting}</span> waiting for a first reply and <span className="text-ivory">{k.followUpsDue}</span> follow-up{k.followUpsDue === 1 ? "" : "s"} due today.
            </>
          )}
        </p>
      </div>

      {/* KPI tiles */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0" data-testid="kpis">
        <div className="tile">
          <dt className="text-xs text-stone">New leads · 7 days</dt>
          <dd className="mt-1 flex items-end justify-between gap-2">
            <span className="font-display text-4xl">{k.leads7}</span>
            <Sparkline values={daily.slice(-14)} />
          </dd>
          <dd className="mt-1"><Delta now={k.leads7} prev={k.leadsPrev7} /></dd>
        </div>
        <div className="tile">
          <dt className="text-xs text-stone">Median first reply · 7 days</dt>
          <dd className="mt-1 font-display text-4xl">{k.median7 == null ? "—" : formatMinutes(k.median7)}</dd>
          <dd className="mt-1"><Delta now={k.median7} prev={k.medianPrev7} invert suffix=" min" /></dd>
        </div>
        <div className="tile">
          <dt className="text-xs text-stone">Consultations booked · 30 days</dt>
          <dd className="mt-1 font-display text-4xl">{k.booked30}</dd>
          <dd className="mt-1 text-xs text-stone">{k.conversion90 == null ? "—" : `${k.conversion90}% of leads book (90 days)`}</dd>
        </div>
        <div className="tile">
          <dt className="text-xs text-stone">Orders · 30 days</dt>
          <dd className="mt-1 font-display text-4xl">{money(k.revenue30, { cents: true })}</dd>
          <dd className="mt-1 text-xs text-stone">{k.orders30} order{k.orders30 === 1 ? "" : "s"} · <Delta now={k.revenue30 / 100} prev={k.revenuePrev30 / 100} /></dd>
        </div>
      </dl>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        {/* Needs you now */}
        <section className="card p-5 md:p-6" aria-labelledby="now-h">
          <div className="flex items-center justify-between">
            <h2 id="now-h" className="flex items-center gap-2 font-display text-2xl"><PhoneCall className="h-5 w-5 text-gold" aria-hidden="true" /> Needs you now</h2>
            <Link href="/now" className="flex items-center gap-1 text-xs text-gold hover:text-gold-bright">Open Today <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {now.length === 0 ? (
            <p className="mt-6 text-sm text-ivory-dim">All caught up. New leads and due follow-ups show here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/8">
              {now.map(({ l, why }) => (
                <li key={`${why}-${l.id}`}>
                  <Link href={`/leads/${l.id}`} className="flex items-center gap-3 rounded-xl py-3 transition-colors hover:bg-white/[.03]">
                    <Avatar name={l.fullName ?? "?"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.fullName ?? l.phone ?? "Unnamed lead"}</span>
                      <span className="block truncate text-xs text-stone">{why === "first reply" ? `Waiting for a first reply · ${l.occasion ?? "enquiry"}` : `Follow-up · ${l.followUpNote ?? "due"}`}</span>
                    </span>
                    <span className={`pill ${why === "first reply" ? "!text-bad" : "!text-warn"}`}><Clock3 className="h-3 w-3" aria-hidden="true" />{why === "first reply" ? "Reply" : "Due"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pipeline snapshot */}
        <section className="card p-5 md:p-6" aria-labelledby="pipe-h">
          <div className="flex items-center justify-between">
            <h2 id="pipe-h" className="font-display text-2xl">Pipeline</h2>
            <span className="text-xs text-stone">{money(pipelineValue, { cents: true })} open</span>
          </div>
          <ul className="mt-4 space-y-3">
            {open.map((f) => (
              <li key={f.stage}>
                <Link href={`/pipeline?stage=${f.stage}`} className="group block">
                  <div className="flex justify-between text-sm">
                    <span className="text-ivory-dim group-hover:text-ivory">{stages.find((s) => s.id === f.stage)!.label}</span>
                    <span className="text-ivory">{f.count}{f.valueCents ? <span className="ml-2 text-xs text-stone">{money(f.valueCents, { cents: true })}</span> : null}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                    <div className="h-full rounded-full" style={{ width: `${(f.count / maxCount) * 100}%`, background: STAGE_COLOR[f.stage] }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <section className="card p-5 md:p-6" aria-labelledby="leads-h">
          <h2 id="leads-h" className="font-display text-2xl">Leads per day</h2>
          <p className="mb-4 text-xs text-stone">Last 30 days, by source</p>
          <LeadsChart data={days} />
        </section>
        <section className="card p-5 md:p-6" aria-labelledby="speed-h">
          <h2 id="speed-h" className="font-display text-2xl">Median first reply</h2>
          <p className="mb-4 text-xs text-stone">Per week, last 8 weeks</p>
          <ResponseChart data={weeks} />
        </section>
      </div>

      <section className="card p-5 md:p-6" aria-labelledby="events-h">
        <div className="flex items-center justify-between">
          <h2 id="events-h" className="flex items-center gap-2 font-display text-2xl"><CalendarHeart className="h-5 w-5 text-gold" aria-hidden="true" /> Coming up</h2>
          <Link href="/ads" className="text-xs text-gold hover:text-gold-bright">Meta ads report →</Link>
        </div>
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-ivory-dim">No weddings or events in the next 90 days. Add an event date on a client&rsquo;s profile and it appears here.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/leads/${e.id}`} className="tile lift flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[.06] text-center leading-none">
                    <span className="text-[10px] tracking-wider text-gold uppercase">{new Date(`${e.date}T12:00:00`).toLocaleDateString("en-US", { month: "short" })}</span>
                    <span className="font-display text-xl">{Number(e.date.slice(8))}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.name}</span>
                    <span className="block truncate text-xs text-stone">{e.label ?? "Event"} · {e.days === 0 ? "today" : `in ${e.days} day${e.days === 1 ? "" : "s"}`}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
