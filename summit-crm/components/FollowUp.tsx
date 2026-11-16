"use client";

import { useState, useSyncExternalStore } from "react";
import { CalendarClock, Check } from "lucide-react";
import { completeFollowUpAction, setFollowUpAction } from "@/app/(crm)/profile-actions";

/** Quick-pick times are computed on the phone, in Kobe's own time zone, and sent as ISO. */
function at(kind: "today" | "tomorrow" | "3d" | "week") {
  const d = new Date();
  if (kind === "today") { d.setHours(Math.max(d.getHours() + 2, 17), 0, 0, 0); }
  if (kind === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); }
  if (kind === "3d") { d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); }
  if (kind === "week") { d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); }
  return d;
}
const noop = () => () => {};
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const pretty = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function FollowUp({ id, current, note, overdue = false }: { id: string; current: string | null; note: string | null; overdue?: boolean }) {
  const [when, setWhen] = useState(local(at("tomorrow")));
  const [editing, setEditing] = useState(!current);
  // Times depend on the phone's clock and zone: render the picker only after hydration.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  if (current && !editing)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className={`pill !py-1 ${overdue ? "!text-bad" : "!text-ivory"}`}>
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {overdue ? "Overdue · " : ""}{pretty(current)}
        </span>
        {note && <span className="text-sm text-ivory-dim">{note}</span>}
        <form action={completeFollowUpAction} className="ml-auto flex gap-2">
          <input type="hidden" name="id" value={id} />
          <button className="btn !px-4"><Check className="h-3.5 w-3.5" aria-hidden="true" />Done</button>
          <button type="button" className="btn-ghost !px-4" onClick={() => setEditing(true)}>Move</button>
        </form>
      </div>
    );

  if (!mounted) return <div className="h-[104px] sm:h-[92px]" aria-hidden="true" />;
  return (
    <form action={setFollowUpAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="at" value={when ? new Date(when).toISOString() : ""} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick picks">
        {([["today", "Later today"], ["tomorrow", "Tomorrow 10am"], ["3d", "In 3 days"], ["week", "Next week"]] as const).map(([k, label]) => (
          <button key={k} type="button" className={`pill !py-1.5 hover:text-ivory ${when === local(at(k)) ? "!border-gold/60 !text-gold-bright" : ""}`} onClick={() => setWhen(local(at(k)))}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[13rem_1fr_auto]">
        <label className="sr-only" htmlFor={`fu-at-${id}`}>When</label>
        <input id={`fu-at-${id}`} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className="field" />
        <label className="sr-only" htmlFor={`fu-note-${id}`}>What to do</label>
        <input id={`fu-note-${id}`} name="note" defaultValue={note ?? ""} placeholder="Call about fabric choices…" maxLength={300} className="field" />
        <div className="flex gap-2">
          <button className="btn">Set follow-up</button>
          {current && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      </div>
    </form>
  );
}
