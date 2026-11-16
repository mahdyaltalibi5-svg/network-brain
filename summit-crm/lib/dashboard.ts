import { getDb } from "./db";
import { stageIds, type StageId } from "./stages";

/**
 * Dashboard figures. Days are Mountain Time (the studio's day), not UTC, so "today" matches
 * Kobe's clock. Response times exclude leads that arrived long after they were submitted.
 */
const TZ = "America/Denver";
const n = (v: unknown) => Number(v ?? 0);

export type Source = "meta" | "website" | "manual";
export type DayRow = { day: string; meta: number; website: number; manual: number };

/** Leads per day for the last `days` days (oldest first), split by source; empty days included. */
export async function leadsByDay(days = 30): Promise<DayRow[]> {
  const db = await getDb();
  const rows = await db.query<{ day: string; source: Source; c: number }>(
    `SELECT to_char((lead_created_at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS day, source, count(*)::int AS c
     FROM leads WHERE lead_created_at >= ((now() AT TIME ZONE '${TZ}')::date - ($1::int - 1))::timestamp AT TIME ZONE '${TZ}'
     GROUP BY 1, 2`,
    [days],
  );
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const out: DayRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ day: key, meta: 0, website: 0, manual: 0 });
  }
  const idx = new Map(out.map((r, i) => [r.day, i]));
  for (const r of rows) {
    const i = idx.get(r.day);
    if (i != null) out[i][r.source] = n(r.c);
  }
  return out;
}

export type Kpis = {
  leads7: number; leadsPrev7: number;
  booked30: number; bookedPrev30: number;
  orders30: number; revenue30: number; revenuePrev30: number;
  conversion90: number | null; // share of leads (last 90 days) that booked
  median7: number | null; medianPrev7: number | null;
  followUpsDue: number; waiting: number;
};

export async function kpis(): Promise<Kpis> {
  const db = await getDb();
  const r = (
    await db.query(
      `SELECT
        count(*) FILTER (WHERE lead_created_at > now() - interval '7 days') AS leads7,
        count(*) FILTER (WHERE lead_created_at <= now() - interval '7 days' AND lead_created_at > now() - interval '14 days') AS leads_prev7,
        count(*) FILTER (WHERE booked_at > now() - interval '30 days') AS booked30,
        count(*) FILTER (WHERE booked_at <= now() - interval '30 days' AND booked_at > now() - interval '60 days') AS booked_prev30,
        count(*) FILTER (WHERE ordered_at > now() - interval '30 days') AS orders30,
        COALESCE(sum(value_cents) FILTER (WHERE ordered_at > now() - interval '30 days'), 0) AS revenue30,
        COALESCE(sum(value_cents) FILTER (WHERE ordered_at <= now() - interval '30 days' AND ordered_at > now() - interval '60 days'), 0) AS revenue_prev30,
        count(*) FILTER (WHERE lead_created_at > now() - interval '90 days') AS leads90,
        count(*) FILTER (WHERE lead_created_at > now() - interval '90 days' AND booked_at IS NOT NULL) AS booked90,
        count(*) FILTER (WHERE follow_up_at IS NOT NULL AND follow_up_at < ((now() AT TIME ZONE '${TZ}')::date + 1)::timestamp AT TIME ZONE '${TZ}') AS fu_due,
        count(*) FILTER (WHERE first_contact_at IS NULL AND stage = 'new') AS waiting
       FROM leads`,
    )
  )[0];
  const med = async (from: string, to: string) => {
    const m = (
      await db.query(
        `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_contact_at - lead_created_at)) / 60) AS m
         FROM leads WHERE first_contact_at IS NOT NULL AND created_at - lead_created_at < interval '30 minutes'
           AND lead_created_at > now() - interval '${from}' AND lead_created_at <= now() - interval '${to}'`,
      )
    )[0]?.m;
    return m == null ? null : Math.max(0, Number(m));
  };
  return {
    leads7: n(r.leads7), leadsPrev7: n(r.leads_prev7),
    booked30: n(r.booked30), bookedPrev30: n(r.booked_prev30),
    orders30: n(r.orders30), revenue30: n(r.revenue30), revenuePrev30: n(r.revenue_prev30),
    conversion90: n(r.leads90) ? Math.round((n(r.booked90) / n(r.leads90)) * 100) : null,
    median7: await med("7 days", "0 days"), medianPrev7: await med("14 days", "7 days"),
    followUpsDue: n(r.fu_due), waiting: n(r.waiting),
  };
}

export type WeekRow = { week: string; median: number | null; count: number };

/** Median first response per week (Monday start), last `weeks` weeks. */
export async function responseByWeek(weeks = 8): Promise<WeekRow[]> {
  const db = await getDb();
  const rows = await db.query<{ wk: string; m: number | null; c: number }>(
    `SELECT to_char(date_trunc('week', lead_created_at AT TIME ZONE '${TZ}'), 'YYYY-MM-DD') AS wk,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_contact_at - lead_created_at)) / 60) AS m,
            count(*)::int AS c
     FROM leads WHERE first_contact_at IS NOT NULL AND created_at - lead_created_at < interval '30 minutes'
       AND lead_created_at > now() - ($1 || ' weeks')::interval
     GROUP BY 1`,
    [String(weeks)],
  );
  const by = new Map(rows.map((r) => [r.wk, r]));
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const out: WeekRow[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const r = by.get(key);
    out.push({ week: key, median: r?.m == null ? null : Math.max(0, Number(r.m)), count: n(r?.c) });
  }
  return out;
}

export type StageRow = { stage: StageId; count: number; valueCents: number };

export async function stageSummary(): Promise<StageRow[]> {
  const db = await getDb();
  const rows = await db.query<{ stage: StageId; c: number; v: number }>(`SELECT stage, count(*)::int AS c, COALESCE(sum(value_cents), 0) AS v FROM leads GROUP BY stage`);
  const by = new Map(rows.map((r) => [r.stage, r]));
  return stageIds.map((s) => ({ stage: s, count: n(by.get(s)?.c), valueCents: n(by.get(s)?.v) }));
}

export type EventRow = { id: string; name: string; label: string | null; date: string; days: number };

/** Weddings and events coming up in the next `days` days. */
export async function upcomingEvents(days = 90): Promise<EventRow[]> {
  const db = await getDb();
  const rows = await db.query<{ id: string; full_name: string | null; event_label: string | null; d: string; days: number }>(
    `SELECT id, full_name, event_label, to_char(event_date, 'YYYY-MM-DD') AS d,
            (event_date - (now() AT TIME ZONE '${TZ}')::date)::int AS days
     FROM leads WHERE event_date IS NOT NULL AND stage <> 'lost'
       AND event_date >= (now() AT TIME ZONE '${TZ}')::date AND event_date < (now() AT TIME ZONE '${TZ}')::date + $1::int
     ORDER BY event_date LIMIT 8`,
    [days],
  );
  return rows.map((r) => ({ id: String(r.id), name: r.full_name ?? "Unnamed", label: r.event_label, date: r.d, days: n(r.days) }));
}
