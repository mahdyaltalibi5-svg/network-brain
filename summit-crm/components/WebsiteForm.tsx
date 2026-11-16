"use client";

import { useActionState, useEffect, useState } from "react";
import { publishAction, type PublishState } from "@/app/(crm)/website/actions";
import type { SiteChange, SiteSettings } from "@/lib/site";

function Status({ initial, siteUrl }: { initial: SiteChange; siteUrl: string }) {
  const [c, setC] = useState(initial);
  useEffect(() => {
    if (c.status !== "publishing") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/site/changes/${c.id}`);
      if (r.ok) setC(await r.json());
    }, 3000);
    return () => clearInterval(t);
  }, [c.id, c.status]);
  return (
    <p role="status" className={`card mt-6 p-4 text-sm ${c.status === "failed" ? "text-bad" : c.status === "live" ? "text-ok" : "text-ivory"}`}>
      {c.status === "publishing" && <>Publishing: {c.summary}. The site rebuilds in about a minute…</>}
      {c.status === "live" && (
        <>
          Live on the website: {c.summary}.{" "}
          <a href={siteUrl} target="_blank" rel="noopener" className="underline">View the site</a> (refresh if you still see the old version).
        </>
      )}
      {c.status === "failed" && <>Didn&rsquo;t publish: {c.error ?? "the site build failed"}. Nothing on the live site changed.</>}
    </p>
  );
}

/** Edits the business details shown across summitcustomsuits.com. */
export function WebsiteForm({ settings, siteUrl }: { settings: SiteSettings; siteUrl: string }) {
  const [state, action, pending] = useActionState<PublishState, FormData>(publishAction, {});
  const [ann, setAnn] = useState(settings.announcement);
  const field = "field";
  return (
    <form action={action} className="mt-8 space-y-10">
      <section aria-labelledby="ann-h" className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="ann-h" className="font-display text-2xl">Announcement bar</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="annOn" checked={ann.enabled} onChange={(e) => setAnn({ ...ann, enabled: e.target.checked })} className="h-4 w-4 accent-[var(--gold)]" />
            Show on every page
          </label>
        </div>
        <p className="mt-1 text-sm text-stone">A slim line above the menu: holiday hours, a trunk show, a booking push. Visitors can dismiss it.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label className="label" htmlFor="annText">Message</label>
            <input id="annText" name="annText" maxLength={140} value={ann.text} onChange={(e) => setAnn({ ...ann, text: e.target.value })} placeholder="Holiday fittings now booking for December." className={field} />
          </div>
          <div>
            <label className="label" htmlFor="annLinkText">Link label (optional)</label>
            <input id="annLinkText" name="annLinkText" maxLength={40} value={ann.linkText} onChange={(e) => setAnn({ ...ann, linkText: e.target.value })} placeholder="Book a fitting" className={field} />
          </div>
          <div>
            <label className="label" htmlFor="annLink">Link (optional)</label>
            <input id="annLink" name="annLink" value={ann.link} onChange={(e) => setAnn({ ...ann, link: e.target.value })} placeholder="/book" className={field} />
          </div>
        </div>
        {ann.enabled && ann.text && (
          <div className="mt-4 border border-gold/40 bg-[#0b0b0c] px-4 py-2 text-center text-[12.5px] tracking-wide" aria-label="Preview">
            {ann.text} {ann.link && <span className="ml-2 border-b border-gold/40 text-gold-bright">{ann.linkText || "Learn more"} →</span>}
          </div>
        )}
      </section>

      <section aria-labelledby="contact-h" className="card p-5">
        <h2 id="contact-h" className="font-display text-2xl">Phone &amp; email</h2>
        <p className="mt-1 text-sm text-stone">Changes every call button, footer, contact page and the details Google reads.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" required defaultValue={settings.phone} className={field} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required defaultValue={settings.email} className={field} />
          </div>
        </div>
      </section>

      <section aria-labelledby="hours-h" className="card p-5">
        <h2 id="hours-h" className="font-display text-2xl">Hours</h2>
        <p className="mt-1 text-sm text-stone">Shown as “{settings.hours.days}, {settings.hours.open} to {settings.hours.close}” and “{settings.hours.daysShort} · {settings.hours.open}–{settings.hours.close}”.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="label" htmlFor="days">Days</label>
            <input id="days" name="days" required defaultValue={settings.hours.days} className={field} />
          </div>
          <div>
            <label className="label" htmlFor="daysShort">Days, short</label>
            <input id="daysShort" name="daysShort" required defaultValue={settings.hours.daysShort} className={field} />
          </div>
          <div>
            <label className="label" htmlFor="open">Opens</label>
            <input id="open" name="open" required defaultValue={settings.hours.open} className={field} />
          </div>
          <div>
            <label className="label" htmlFor="close">Closes</label>
            <input id="close" name="close" required defaultValue={settings.hours.close} className={field} />
          </div>
        </div>
      </section>

      {state.errors && (
        <ul role="alert" className="space-y-1 text-sm text-bad">
          {state.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn" disabled={pending}>{pending ? "Publishing…" : "Publish to the website"}</button>
        <p className="text-xs text-stone">Goes live in about a minute. Every change is saved, so it can be undone.</p>
      </div>
      {state.change && <Status key={state.change.id} initial={state.change} siteUrl={siteUrl} />}
    </form>
  );
}
