import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarHeart, FileText, Mail, Phone, Ruler, Scissors, Shirt, Sparkles, Trash2 } from "lucide-react";
import { Avatar, SourceBadge, StageBadge } from "@/components/Badges";
import { ContactButtons } from "@/components/ContactButtons";
import { FileUpload } from "@/components/FileUpload";
import { FollowUp } from "@/components/FollowUp";
import { Since } from "@/components/Since";
import { StageSelect } from "@/components/StageSelect";
import { withBase } from "@/lib/base";
import { money, sourceLabel, when } from "@/lib/format";
import { activities, getLead } from "@/lib/leads";
import { files, garments, GARMENT_KINDS, GARMENT_STATUS, MEASUREMENTS, PREFERENCES } from "@/lib/profile";
import { formatMinutes, textTemplate } from "@/lib/speed";
import { addNoteAction, deleteLeadAction, moveLeadAction, updateContactAction } from "../../actions";
import { addGarmentAction, deleteFileAction, deleteGarmentAction, garmentStatusAction, saveDetailsAction, saveMeasurementsAction, savePreferencesAction } from "../../profile-actions";

export const metadata: Metadata = { title: "Client" };

const TABS = [
  { id: "overview", label: "Overview", Icon: Sparkles },
  { id: "measurements", label: "Measurements", Icon: Ruler },
  { id: "style", label: "Style", Icon: Scissors },
  { id: "garments", label: "Garments", Icon: Shirt },
  { id: "files", label: "Files", Icon: FileText },
] as const;
type Tab = (typeof TABS)[number]["id"];

const kindLabel: Record<string, string> = { created: "Created", stage: "Stage", note: "Note", capi: "Meta", value: "Value", call: "Call", text: "Text", email: "Email", followup: "Follow-up", profile: "Profile" };
const kb = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await connection();
  const { id } = await params;
  const want = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t.id === want)?.id ?? "overview";
  const lead = await getLead(id);
  if (!lead) notFound();
  const [log, gs, fs] = await Promise.all([activities(id), garments(id), files(id)]);
  const name = lead.fullName ?? lead.email ?? lead.phone ?? "Unnamed lead";
  const measured = Object.keys(lead.measurements).length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-ivory"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Pipeline</Link>

      {/* Header */}
      <section className="card p-5 md:p-7">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StageBadge stage={lead.stage} />
              <SourceBadge source={lead.source} />
              {lead.campaignName && <span className="pill">{lead.campaignName}</span>}
            </div>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ivory-dim">
              {lead.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-stone" aria-hidden="true" />{lead.phone}</span>}
              {lead.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-stone" aria-hidden="true" />{lead.email}</span>}
              {lead.occasion && <span>{lead.occasion}</span>}
            </p>
            <p className="mt-2 text-sm text-stone" data-testid="response">
              {lead.firstContactAt ? (
                <>First response in <span className="text-ivory">{formatMinutes(Math.max(0, (lead.firstContactAt.getTime() - lead.leadCreatedAt.getTime()) / 60000))}</span></>
              ) : (
                <>Waiting for a reply · <Since iso={lead.leadCreatedAt.toISOString()} /></>
              )}
            </p>
          </div>
          <div className="w-full sm:w-60">
            <p className="label">Stage</p>
            <StageSelect id={lead.id} stage={lead.stage} valueCents={lead.valueCents} action={moveLeadAction} />
          </div>
        </div>
        {(lead.platform === "instagram_dm" || lead.platform === "messenger") && (
          <a
            href={lead.platform === "instagram_dm" ? "https://www.instagram.com/direct/inbox/" : "https://business.facebook.com/latest/inbox/all"}
            target="_blank"
            rel="noopener"
            className="btn mt-5"
          >
            Reply in {lead.platform === "instagram_dm" ? "Instagram" : "Messenger"}
          </a>
        )}
        <div className="mt-5 hidden max-w-md md:block">
          <ContactButtons id={lead.id} phone={lead.phone} email={lead.email} text={textTemplate(lead)} />
        </div>
      </section>

      {/* Tabs */}
      <nav aria-label="Client sections" className="glass -mx-1 flex gap-1 overflow-x-auto !rounded-full p-1">
        {TABS.map(({ id: t, label, Icon }) => (
          <Link key={t} href={t === "overview" ? `/leads/${id}` : `/leads/${id}?tab=${t}`} aria-current={tab === t ? "page" : undefined} scroll={false}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${tab === t ? "bg-white/10 text-gold-bright" : "text-ivory-dim hover:text-ivory"}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
            {t === "measurements" && measured > 0 && <span className="text-xs text-stone">{measured}</span>}
            {t === "garments" && gs.length > 0 && <span className="text-xs text-stone">{gs.length}</span>}
            {t === "files" && fs.length > 0 && <span className="text-xs text-stone">{fs.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
          <div className="space-y-6">
            <section aria-labelledby="fu-h" className="card p-5">
              <h2 id="fu-h" className="mb-3 font-display text-2xl">Next follow-up</h2>
              <FollowUp key={lead.followUpAt?.toISOString() ?? "none"} id={lead.id} current={lead.followUpAt?.toISOString() ?? null} note={lead.followUpNote} overdue={!!lead.followUpAt && lead.followUpAt < new Date()} />
            </section>
            <section aria-labelledby="notes-h" className="card p-5">
              <h2 id="notes-h" className="font-display text-2xl">Notes &amp; activity</h2>
              <form action={addNoteAction} className="mt-4 space-y-2">
                <input type="hidden" name="id" value={lead.id} />
                <label htmlFor="note" className="sr-only">Add a note</label>
                <textarea id="note" name="note" rows={3} required placeholder="Called, left voicemail. Wedding is June 14…" className="field" />
                <button className="btn">Add note</button>
              </form>
              <ol className="mt-6 space-y-4 border-t border-white/8 pt-4">
                {log.map((a) => (
                  <li key={a.id} className="grid grid-cols-[5rem_1fr] gap-3 text-sm">
                    <span className={`text-[11px] font-semibold tracking-wider uppercase ${a.kind === "capi" ? (a.body.startsWith("Sent") ? "text-ok" : "text-warn") : "text-stone"}`}>{kindLabel[a.kind] ?? a.kind}</span>
                    <div><p className="whitespace-pre-wrap">{a.body}</p><p className="mt-0.5 text-xs text-stone">{when(a.createdAt)}</p></div>
                  </li>
                ))}
              </ol>
            </section>
            {(lead.answers.length > 0 || lead.notes) && (
              <section aria-labelledby="answers-h" className="card p-5">
                <h2 id="answers-h" className="font-display text-2xl">{lead.source === "meta" ? "Form answers" : "Their message"}</h2>
                {lead.notes && <p className="mt-3 whitespace-pre-wrap text-ivory-dim">{lead.notes}</p>}
                {lead.answers.length > 0 && (
                  <dl className="mt-3 divide-y divide-white/8">
                    {lead.answers.map((a, i) => (
                      <div key={i} className="grid gap-1 py-2 sm:grid-cols-[40%_1fr]"><dt className="text-sm text-stone">{a.question}</dt><dd>{a.answer}</dd></div>
                    ))}
                  </dl>
                )}
              </section>
            )}
          </div>
          <aside className="space-y-6">
            <section aria-labelledby="deal-h" className="card p-5">
              <h2 id="deal-h" className="flex items-center gap-2 font-display text-2xl"><CalendarHeart className="h-5 w-5 text-gold" aria-hidden="true" />Event &amp; value</h2>
              <form key={`${lead.eventDate}|${lead.eventLabel}|${lead.valueCents}`} action={saveDetailsAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={lead.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label" htmlFor="eventLabel">Event</label><input id="eventLabel" name="eventLabel" defaultValue={lead.eventLabel ?? ""} placeholder="e.g. Wedding" className="field" /></div>
                  <div><label className="label" htmlFor="eventDate">Date</label><input id="eventDate" name="eventDate" type="date" defaultValue={lead.eventDate ?? ""} className="field" /></div>
                </div>
                <div><label className="label" htmlFor="value">Deal value (USD)</label><input id="value" name="value" inputMode="decimal" defaultValue={lead.valueCents != null ? String(lead.valueCents / 100) : ""} placeholder="e.g. 2,850" className="field" /></div>
                <button className="btn-ghost">Save</button>
              </form>
            </section>
            <section aria-labelledby="contact-h" className="card p-5">
              <h2 id="contact-h" className="font-display text-2xl">Contact</h2>
              <form key={`${lead.fullName}|${lead.phone}|${lead.email}|${lead.occasion}`} action={updateContactAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={lead.id} />
                {([["fullName", "Name", lead.fullName, "text"], ["phone", "Phone", lead.phone, "tel"], ["email", "Email", lead.email, "email"], ["occasion", "What for", lead.occasion, "text"]] as const).map(([n, label, v, type]) => (
                  <div key={n}><label className="label" htmlFor={`c-${n}`}>{label}</label><input id={`c-${n}`} name={n} type={type} defaultValue={v ?? ""} className="field" /></div>
                ))}
                <button className="btn-ghost">Save contact</button>
              </form>
            </section>
            <section aria-labelledby="attr-h" className="card p-5">
              <h2 id="attr-h" className="font-display text-2xl">Where they came from</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {([["Source", sourceLabel[lead.source]], ["Campaign", lead.campaignName], ["Ad set", lead.adsetName], ["Ad", lead.adName], ["Platform", ({ ig: "Instagram", fb: "Facebook", instagram_dm: "Instagram message", messenger: "Facebook Messenger" } as Record<string, string>)[lead.platform ?? ""] ?? lead.platform], ["Received", when(lead.leadCreatedAt)]] as const)
                  .filter(([, v]) => v)
                  .map(([k, v]) => <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2"><dt className="text-stone">{k}</dt><dd className="break-words">{v}</dd></div>)}
              </dl>
            </section>
            <details className="text-sm">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-stone hover:text-bad"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete this lead</summary>
              <form action={deleteLeadAction} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={lead.id} />
                <input type="hidden" name="confirm" value="yes" />
                <p className="text-ivory-dim">For spam, duplicates and tests. The lead and its history are removed for good.</p>
                <button className="btn-ghost !border-bad/60 !text-bad">Yes, delete it</button>
              </form>
            </details>
          </aside>
        </div>
      )}

      {tab === "measurements" && (
        <form key={JSON.stringify(lead.measurements)} action={saveMeasurementsAction} className="card space-y-6 p-5 md:p-6">
          <input type="hidden" name="id" value={lead.id} />
          <p className="text-sm text-ivory-dim">Inches unless noted. Saved to this client&rsquo;s pattern record; every update is logged.</p>
          {[...new Set(MEASUREMENTS.map((m) => m.group))].map((g) => (
            <fieldset key={g}>
              <legend className="mb-3 text-xs font-semibold tracking-[0.18em] text-gold uppercase">{g}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {MEASUREMENTS.filter((m) => m.group === g).map((m) => (
                  <div key={m.key} className={m.key === "posture" ? "col-span-2 sm:col-span-3 lg:col-span-5" : ""}>
                    <label className="label" htmlFor={`m-${m.key}`}>{m.label}</label>
                    <input id={`m-${m.key}`} name={m.key} defaultValue={lead.measurements[m.key] ?? ""} inputMode={m.key === "posture" ? "text" : "decimal"} className="field" />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
          <button className="btn">Save measurements</button>
        </form>
      )}

      {tab === "style" && (
        <form key={JSON.stringify(lead.preferences)} action={savePreferencesAction} className="card space-y-5 p-5 md:p-6">
          <input type="hidden" name="id" value={lead.id} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PREFERENCES.map((f) => (
              <div key={f.key} className={!f.options && ["notes", "fabrics"].includes(f.key) ? "sm:col-span-2 lg:col-span-3" : ""}>
                <label className="label" htmlFor={`p-${f.key}`}>{f.label}</label>
                {f.options ? (
                  <select id={`p-${f.key}`} name={f.key} defaultValue={lead.preferences[f.key] ?? ""} className="field">
                    <option value="">Not set</option>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input id={`p-${f.key}`} name={f.key} defaultValue={lead.preferences[f.key] ?? ""} placeholder={f.placeholder} className="field" />
                )}
              </div>
            ))}
          </div>
          <button className="btn">Save style</button>
        </form>
      )}

      {tab === "garments" && (
        <div className="space-y-6">
          {gs.length === 0 ? (
            <p className="tile text-sm text-ivory-dim">No garments yet. Add the first one below.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2" data-testid="garments">
              {gs.map((g) => (
                <li key={g.id} className="tile !p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{g.kind}</p>
                      <p className="text-sm text-ivory-dim">{[g.fabric, g.details].filter(Boolean).join(" · ") || "No details yet"}</p>
                      <p className="mt-1 text-xs text-stone">{[g.priceCents != null && money(g.priceCents, { cents: true }), g.dueDate && `Due ${new Date(`${g.dueDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`].filter(Boolean).join(" · ")}</p>
                    </div>
                    <form action={deleteGarmentAction}><input type="hidden" name="id" value={lead.id} /><input type="hidden" name="garment" value={g.id} /><button className="text-stone hover:text-bad" aria-label={`Remove ${g.kind}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></form>
                  </div>
                  {/* status as a progress track: tap a step to set it */}
                  <form action={garmentStatusAction} className="mt-3 flex flex-wrap gap-1.5">
                    <input type="hidden" name="id" value={lead.id} />
                    <input type="hidden" name="garment" value={g.id} />
                    {GARMENT_STATUS.map((s, i) => {
                      const idx = GARMENT_STATUS.findIndex((x) => x.id === g.status);
                      const done = i <= idx;
                      return (
                        <button key={s.id} name="status" value={s.id} aria-pressed={s.id === g.status}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${s.id === g.status ? "border-gold/70 bg-gold/15 text-gold-bright" : done ? "border-white/15 bg-white/[.06] text-ivory" : "border-white/10 text-stone hover:text-ivory"}`}>
                          {s.label}
                        </button>
                      );
                    })}
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addGarmentAction} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_8rem_10rem_auto] lg:items-end">
            <input type="hidden" name="id" value={lead.id} />
            <div><label className="label" htmlFor="g-kind">Garment</label><select id="g-kind" name="kind" className="field">{GARMENT_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
            <div><label className="label" htmlFor="g-fabric">Cloth</label><input id="g-fabric" name="fabric" placeholder="VBC navy Super 130s" className="field" /></div>
            <div><label className="label" htmlFor="g-details">Details</label><input id="g-details" name="details" placeholder="Peak lapel, half-lined" className="field" /></div>
            <div><label className="label" htmlFor="g-price">Price</label><input id="g-price" name="price" inputMode="decimal" placeholder="e.g. 1,850" className="field" /></div>
            <div><label className="label" htmlFor="g-due">Due</label><input id="g-due" name="due" type="date" className="field" /></div>
            <button className="btn">Add</button>
          </form>
        </div>
      )}

      {tab === "files" && (
        <div className="space-y-6">
          <section className="card p-5"><h2 className="mb-3 font-display text-2xl">Photos &amp; documents</h2><FileUpload id={lead.id} /></section>
          {fs.length === 0 ? (
            <p className="tile text-sm text-ivory-dim">Fitting photos, measurement sheets, invoices: anything for this client.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="files">
              {fs.map((f) => (
                <li key={f.id} className="tile group relative overflow-hidden !p-0">
                  <a href={withBase(`/api/files/${f.id}`)} target="_blank" rel="noopener" className="block">
                    {f.mime.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element -- private files from our API
                      <img src={withBase(`/api/files/${f.id}`)} alt={f.name} loading="lazy" className="aspect-square w-full object-cover" />
                    ) : (
                      <span className="grid aspect-square place-items-center text-stone"><FileText className="h-10 w-10" aria-hidden="true" /></span>
                    )}
                    <span className="block truncate px-3 pt-2 text-xs">{f.name}</span>
                    <span className="block px-3 pb-2 text-[11px] text-stone">{kb(f.size)}</span>
                  </a>
                  <form action={deleteFileAction} className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <input type="hidden" name="id" value={lead.id} /><input type="hidden" name="file" value={f.id} />
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-ivory hover:text-bad" aria-label={`Delete ${f.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Phone: call / text / email always within thumb reach, above the tab bar */}
      <div className="fixed inset-x-3 bottom-[88px] z-20 md:hidden">
        <div className="glass !rounded-full p-1.5"><ContactButtons id={lead.id} phone={lead.phone} email={lead.email} text={textTemplate(lead)} size="lg" /></div>
      </div>
    </div>
  );
}
