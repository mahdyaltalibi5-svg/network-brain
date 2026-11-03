import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { StageSelect } from "@/components/StageSelect";
import { money, sourceLabel, when } from "@/lib/format";
import { activities, getLead } from "@/lib/leads";
import { stage as stageOf } from "@/lib/stages";
import { addNoteAction, moveLeadAction, updateContactAction } from "../../actions";

const kindLabel: Record<string, string> = { created: "Created", stage: "Stage", note: "Note", capi: "Meta", value: "Value" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  const log = await activities(id);
  const tel = lead.phone?.replace(/[^\d+]/g, "");

  return (
    <>
      <Link href="/" className="text-sm text-stone hover:text-ivory">
        ← Pipeline
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">
            {sourceLabel[lead.source]} · {stageOf(lead.stage).label}
          </p>
          <h1 className="mt-2 font-display text-4xl">{lead.fullName ?? "Unnamed lead"}</h1>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ivory-dim">
            {lead.phone && (
              <a href={`tel:${tel}`} className="hover:text-gold">
                {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="hover:text-gold">
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`sms:${tel}`} className="hover:text-gold">
                Text
              </a>
            )}
          </p>
        </div>
        <div className="w-64">
          <p className="label">Stage</p>
          <StageSelect id={lead.id} stage={lead.stage} valueCents={lead.valueCents} action={moveLeadAction} />
          {lead.valueCents != null && <p className="mt-2 text-sm text-gold">Order value {money(lead.valueCents, { cents: true })}</p>}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section aria-labelledby="notes-h" className="card p-5">
            <h2 id="notes-h" className="font-display text-2xl">Notes &amp; activity</h2>
            <form action={addNoteAction} className="mt-4 space-y-2">
              <input type="hidden" name="id" value={lead.id} />
              <label htmlFor="note" className="sr-only">
                Add a note
              </label>
              <textarea id="note" name="note" rows={3} required placeholder="Called, left voicemail. Wedding is June 14…" className="field" />
              <button className="btn">Add note</button>
            </form>
            <ol className="mt-6 space-y-4 border-t border-line-soft pt-4">
              {log.map((a) => (
                <li key={a.id} className="grid grid-cols-[4.5rem_1fr] gap-3 text-sm">
                  <span className={`text-xs font-semibold tracking-wider uppercase ${a.kind === "capi" ? (a.body.startsWith("Sent") ? "text-ok" : "text-warn") : "text-stone"}`}>
                    {kindLabel[a.kind] ?? a.kind}
                  </span>
                  <div>
                    <p className="whitespace-pre-wrap">{a.body}</p>
                    <p className="mt-0.5 text-xs text-stone">{when(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {(lead.answers.length > 0 || lead.notes) && (
            <section aria-labelledby="answers-h" className="card p-5">
              <h2 id="answers-h" className="font-display text-2xl">{lead.source === "meta" ? "Form answers" : "Their message"}</h2>
              {lead.notes && <p className="mt-3 whitespace-pre-wrap text-ivory-dim">{lead.notes}</p>}
              {lead.answers.length > 0 && (
                <dl className="mt-3 divide-y divide-line-soft">
                  {lead.answers.map((a, i) => (
                    <div key={i} className="grid gap-1 py-2 sm:grid-cols-[40%_1fr]">
                      <dt className="text-sm text-stone">{a.question}</dt>
                      <dd>{a.answer}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="contact-h" className="card p-5">
            <h2 id="contact-h" className="font-display text-2xl">Contact</h2>
            <form action={updateContactAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              {(
                [
                  ["fullName", "Name", lead.fullName, "text"],
                  ["phone", "Phone", lead.phone, "tel"],
                  ["email", "Email", lead.email, "email"],
                  ["occasion", "What for", lead.occasion, "text"],
                ] as const
              ).map(([name, label, value, type]) => (
                <div key={name}>
                  <label className="label" htmlFor={`c-${name}`}>
                    {label}
                  </label>
                  <input id={`c-${name}`} name={name} type={type} defaultValue={value ?? ""} className="field" />
                </div>
              ))}
              <button className="btn-ghost">Save contact</button>
            </form>
          </section>

          <section aria-labelledby="attr-h" className="card p-5">
            <h2 id="attr-h" className="font-display text-2xl">Where they came from</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {(
                [
                  ["Source", sourceLabel[lead.source]],
                  ["Campaign", lead.campaignName],
                  ["Ad set", lead.adsetName],
                  ["Ad", lead.adName],
                  ["Platform", lead.platform === "ig" ? "Instagram" : lead.platform === "fb" ? "Facebook" : lead.platform],
                  ["Meta lead ID", lead.metaLeadId],
                  ["Received", when(lead.leadCreatedAt)],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[7rem_1fr] gap-2">
                    <dt className="text-stone">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
