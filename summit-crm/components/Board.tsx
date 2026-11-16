"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CalendarClock, GripVertical } from "lucide-react";
import { moveLeadAction } from "@/app/(crm)/actions";
import { Avatar, SourceBadge } from "@/components/Badges";
import { Since } from "@/components/Since";
import { money } from "@/lib/format";
import { stages, type StageId } from "@/lib/stages";
import { STAGE_COLOR } from "@/lib/ui";

export type CardLead = {
  id: string;
  name: string;
  occasion: string | null;
  source: "meta" | "website" | "manual";
  stage: StageId;
  valueCents: number | null;
  leadCreatedAt: string;
  contacted: boolean;
  followUpAt: string | null;
  eventDate: string | null;
};

const short = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Card({ l, now, overlay = false }: { l: CardLead; now: number; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: l.id, data: { stage: l.stage } });
  const late = l.followUpAt && new Date(l.followUpAt).getTime() < now;
  return (
    <li
      ref={overlay ? undefined : setNodeRef}
      className={`tile lift group relative !p-3.5 ${isDragging && !overlay ? "opacity-30" : ""} ${overlay ? "rotate-2 shadow-2xl ring-1 ring-gold/50" : ""}`}
      data-lead={l.id}
    >
      <div className="flex items-start gap-3">
        <Avatar name={l.name} size={34} />
        <div className="min-w-0 flex-1">
          <Link href={`/leads/${l.id}`} className="block truncate font-medium hover:text-gold" draggable={false}>{l.name}</Link>
          {l.occasion && <p className="truncate text-sm text-ivory-dim">{l.occasion}</p>}
        </div>
        <button
          type="button"
          className="-mr-1 grid h-9 w-7 shrink-0 cursor-grab place-items-center rounded-lg text-stone hover:bg-white/5 hover:text-ivory active:cursor-grabbing"
          aria-label={`Move ${l.name}`}
          {...(overlay ? {} : listeners)}
          {...(overlay ? {} : attributes)}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <SourceBadge source={l.source} short />
        {l.valueCents != null && <span className="pill !text-gold-bright">{money(l.valueCents, { cents: true })}</span>}
        {l.followUpAt && (
          <span className={`pill ${late ? "!text-bad" : ""}`}><CalendarClock className="h-3 w-3" aria-hidden="true" />{short(l.followUpAt)}</span>
        )}
        {l.eventDate && <span className="pill">Event {short(`${l.eventDate}T12:00:00`)}</span>}
      </div>
      {!l.contacted && l.stage === "new" && (
        <p className="mt-2 text-xs text-stone">Not contacted · <Since iso={l.leadCreatedAt} /></p>
      )}
    </li>
  );
}

function Column({ id, leads, active, now }: { id: StageId; leads: CardLead[]; active: boolean; now: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const s = stages.find((x) => x.id === id)!;
  const total = leads.reduce((a, l) => a + (l.valueCents ?? 0), 0);
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`col-${id}`}
      className={`glass flex w-[82vw] shrink-0 snap-start flex-col !rounded-[24px] p-3 transition-[box-shadow,border-color] sm:w-72 ${isOver ? "!border-gold/60 shadow-[0_0_0_1px_rgba(201,164,92,.4),0_20px_50px_-20px_rgba(201,164,92,.5)]" : ""}`}
      data-stage={id}
    >
      <header className="px-1.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h2 id={`col-${id}`} className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full" style={{ background: STAGE_COLOR[id] }} />
            {s.label}
          </h2>
          <span className="pill">{leads.length}</span>
        </div>
        <p className="mt-1 text-xs text-stone">{total ? `${money(total, { cents: true })} · ` : ""}{s.hint}</p>
      </header>
      <ul className={`mt-3 min-h-24 flex-1 space-y-2 rounded-2xl ${active ? "outline-1 outline-white/10 outline-dashed" : ""}`}>
        {leads.map((l) => <Card key={l.id} l={l} now={now} />)}
      </ul>
    </section>
  );
}

/** Drag a card (by its handle) to another column to change its stage. Touch: press and hold. */
export function Board({ leads: initial, now }: { leads: CardLead[]; now: number }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const byStage = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, leads.filter((l) => l.stage === s.id)])) as Record<StageId, CardLead[]>, [leads]);
  const dragging = leads.find((l) => l.id === dragId) ?? null;

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const to = e.over?.id as StageId | undefined;
    const lead = leads.find((l) => l.id === e.active.id);
    if (!to || !lead || lead.stage === to) return;
    let value = "";
    if (to === "ordered") {
      const v = window.prompt("Order value in USD (for Meta's return-on-ad-spend):", lead.valueCents != null ? String(lead.valueCents / 100) : "");
      if (v === null) return;
      value = v;
    }
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, stage: to, contacted: l.contacted || to !== "new" } : l)));
    const fd = new FormData();
    fd.set("id", lead.id);
    fd.set("stage", to);
    fd.set("value", value);
    start(async () => {
      await moveLeadAction(fd);
      router.refresh();
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragId(String(e.active.id))} onDragCancel={() => setDragId(null)} onDragEnd={onDragEnd}>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:snap-none md:-mx-6 md:px-6" data-testid="board">
        {stages.map((s) => <Column key={s.id} id={s.id} leads={byStage[s.id]} active={!!dragId} now={now} />)}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>{dragging ? <ul><Card l={dragging} now={now} overlay /></ul> : null}</DragOverlay>
    </DndContext>
  );
}
