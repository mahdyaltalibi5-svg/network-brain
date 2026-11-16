import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertsToggle } from "@/components/AlertsToggle";
import { ContactButtons } from "@/components/ContactButtons";
import { Since } from "@/components/Since";
import { config } from "@/lib/config";
import { sourceLabel } from "@/lib/format";
import { formatMinutes, speedStats, textTemplate, waitingLeads } from "@/lib/speed";

export const metadata: Metadata = { title: "Respond" };

/** The phone's home screen: who's waiting, how long, and one tap to reach them. */
export default async function NowPage() {
  await connection();
  const [waiting, stats] = await Promise.all([waitingLeads(), speedStats(30)]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Speed to lead</p>
          <h1 className="mt-2 font-display text-5xl">{waiting.length ? `${waiting.length} waiting on you` : "Nobody waiting"}</h1>
          <p className="mt-2 text-sm text-ivory-dim">Reply inside 5 minutes and a lead is far more likely to book. The clock starts the moment they submit.</p>
        </div>
      </div>

      <div className="mt-6">
        <AlertsToggle publicKey={config.push.publicKey()} compact />
      </div>


      {waiting.length === 0 ? (
        <p className="card mt-8 p-6 text-ivory-dim">
          All caught up. New leads appear here the moment they arrive. <Link href="/" className="text-gold underline">Open the pipeline</Link>
        </p>
      ) : (
        <ul className="mt-8 space-y-3" data-testid="waiting">
          {waiting.map((l) => (
            <li key={l.id} className="card lift p-4 md:flex md:items-center md:gap-6 md:p-5" data-lead={l.id}>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <Link href={`/leads/${l.id}`} className="truncate text-lg font-medium hover:text-gold">
                    {l.fullName ?? l.email ?? l.phone ?? "Unnamed lead"}
                  </Link>
                  <span className="shrink-0 text-xs text-stone">
                    waiting <Since iso={l.leadCreatedAt.toISOString()} className="text-base" />
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-ivory-dim">
                  {[l.occasion, sourceLabel[l.source], l.campaignName].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="mt-3 md:mt-0 md:w-80">
                <ContactButtons id={l.id} phone={l.phone} email={l.email} text={textTemplate(l)} size="lg" />
              </div>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="speed">
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
    </>
  );
}
