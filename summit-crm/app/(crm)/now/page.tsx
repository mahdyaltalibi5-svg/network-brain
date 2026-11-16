import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarClock, Check, Zap } from "lucide-react";
import { AlertsToggle } from "@/components/AlertsToggle";
import { Avatar, SourceBadge } from "@/components/Badges";
import { ContactButtons } from "@/components/ContactButtons";
import { Since } from "@/components/Since";
import { config } from "@/lib/config";
import { dueFollowUps, upcomingFollowUps } from "@/lib/followups";
import type { Lead } from "@/lib/leads";
import { formatMinutes, speedStats, textTemplate, waitingLeads } from "@/lib/speed";
import { completeFollowUpAction } from "../profile-actions";

export const metadata: Metadata = { title: "Today" };

const when = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/Denver", weekday: "short", hour: "numeric", minute: "2-digit" });

function LeadRow({ l, children, aside }: { l: Lead; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <li className="card lift p-4 md:flex md:items-center md:gap-6 md:p-5" data-lead={l.id}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={l.fullName ?? "?"} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <Link href={`/leads/${l.id}`} className="truncate text-[1.05rem] font-medium hover:text-gold">{l.fullName ?? l.email ?? l.phone ?? "Unnamed lead"}</Link>
            {aside}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ivory-dim">{children}</div>
        </div>
      </div>
      <div className="mt-4 md:mt-0 md:w-80">
        <ContactButtons id={l.id} phone={l.phone} email={l.email} text={textTemplate(l)} size="lg" />
      </div>
    </li>
  );
}

/** The phone's home screen: who needs a first reply, who's due a follow-up, and how fast we are. */
export default async function TodayPage() {
  await connection();
  const [waiting, due, upcoming, stats] = await Promise.all([waitingLeads(), dueFollowUps(), upcomingFollowUps(7), speedStats(30)]);
  const nowMs = new Date().getTime();

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Today</p>
        <h1 className="mt-2 font-display text-5xl">{waiting.length + due.length ? `${waiting.length + due.length} to reach` : "All caught up"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ivory-dim">New leads first: reply inside 5 minutes and they are far more likely to book. Then your follow-ups.</p>
      </div>

      <AlertsToggle publicKey={config.push.publicKey()} compact />

      <section aria-labelledby="w-h">
        <h2 id="w-h" className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-ivory">
          <Zap className="h-4 w-4 text-gold" aria-hidden="true" /> Waiting for a first reply <span className="pill">{waiting.length}</span>
        </h2>
        {waiting.length === 0 ? (
          <p className="tile text-sm text-ivory-dim">Nobody waiting. New leads appear here the moment they arrive.</p>
        ) : (
          <ul className="space-y-3" data-testid="waiting">
            {waiting.map((l) => (
              <LeadRow key={l.id} l={l} aside={<span className="shrink-0 text-xs text-stone">waiting <Since iso={l.leadCreatedAt.toISOString()} className="text-base" /></span>}>
                {l.occasion && <span>{l.occasion}</span>}
                <SourceBadge source={l.source} short />
                {l.campaignName && <span className="truncate text-xs text-stone">{l.campaignName}</span>}
              </LeadRow>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="f-h">
        <h2 id="f-h" className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-ivory">
          <CalendarClock className="h-4 w-4 text-gold" aria-hidden="true" /> Follow-ups due <span className="pill">{due.length}</span>
        </h2>
        {due.length === 0 ? (
          <p className="tile text-sm text-ivory-dim">No follow-ups due today. Set one from any client&rsquo;s page.</p>
        ) : (
          <ul className="space-y-3" data-testid="followups">
            {due.map((l) => {
              const late = l.followUpAt!.getTime() < nowMs;
              return (
                <LeadRow
                  key={l.id}
                  l={l}
                  aside={
                    <form action={completeFollowUpAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="pill hover:!text-ok" aria-label={`Mark follow-up with ${l.fullName ?? "this lead"} done`}><Check className="h-3 w-3" aria-hidden="true" />Done</button>
                    </form>
                  }
                >
                  <span className={late ? "text-bad" : "text-warn"}>{late ? "Overdue" : "Today"} · {when(l.followUpAt!)}</span>
                  {l.followUpNote && <span className="truncate">{l.followUpNote}</span>}
                </LeadRow>
              );
            })}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="u-h">
          <h2 id="u-h" className="mb-3 text-sm font-semibold tracking-wide text-ivory">This week</h2>
          <ul className="card divide-y divide-white/8 px-4">
            {upcoming.map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="flex items-center gap-3 py-3">
                  <Avatar name={l.fullName ?? "?"} size={32} />
                  <span className="min-w-0 flex-1 truncate">{l.fullName}<span className="ml-2 text-sm text-stone">{l.followUpNote}</span></span>
                  <span className="text-xs text-ivory-dim">{when(l.followUpAt!)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="speed">
        {(
          [
            ["Median first response", stats.medianMin == null ? "—" : formatMinutes(stats.medianMin)],
            ["Answered in 5 min", stats.within5 == null ? "—" : `${stats.within5}%`],
            ["Answered in 15 min", stats.within15 == null ? "—" : `${stats.within15}%`],
            ["Leads answered (30 days)", String(stats.responded)],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="tile">
            <dt className="text-xs text-stone">{k}</dt>
            <dd className="mt-1 font-display text-3xl">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
