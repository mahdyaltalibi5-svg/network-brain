import { config } from "./config";
import { getDb } from "./db";
import { sendFollowUpReminders } from "./followups";
import { sendNudges } from "./speed";
import { readSettings, writeSettings } from "./vault";

/**
 * Speed-to-lead clock with no outside scheduler. When a fresh lead lands, the CRM starts a short
 * "ticker": a background run that checks every 30 seconds and sends the 5 / 15 / 60-minute
 * "still waiting" reminders (and catches any form lead Meta didn't push). Each run lasts up to
 * ~4.5 minutes, then starts the next one, but only while someone new is still waiting. When
 * every fresh lead has been contacted (or is over an hour old), it stops by itself.
 */
const TICK_MS = 30_000;
const RUN_MS = 270_000; // Vercel functions here may run 300 s
const KEY = "speed.ticker_until";

export const tickUrl = () => `${config.publicUrl()}/api/speed/tick?key=${encodeURIComponent(config.cronSecret() ?? "")}`;

/** Is anyone fresh still waiting for a first reply (so the clock should keep running)? */
export async function needsTicker(now = new Date()) {
  const db = await getDb();
  const steps = config.nudgeMinutes();
  const last = Math.max(...steps, 5);
  const r = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM leads
     WHERE first_contact_at IS NULL AND stage = 'new' AND nudges < $3
       AND lead_created_at > $1::timestamptz - ($2 || ' minutes')::interval
       AND created_at - lead_created_at < interval '30 minutes'`,
    [now.toISOString(), String(last + 5), steps.length],
  );
  return Number(r[0].n) > 0;
}

async function running(now = Date.now()) {
  const s = await readSettings(KEY);
  return s[KEY] ? Date.parse(s[KEY]) > now : false;
}

/** Starts the ticker if it isn't already running. Safe to call on every new lead. */
export async function kickTicker(fetcher?: typeof fetch) {
  if (!fetcher && process.env.NODE_ENV === "test") return false; // tests never call the live site
  if (!config.cronSecret() || (await running())) return false;
  await writeSettings({ [KEY]: new Date(Date.now() + 60_000).toISOString() });
  // The tick route answers at once and keeps working in the background.
  await Promise.race([(fetcher ?? fetch)(tickUrl(), { method: "POST", cache: "no-store" }).catch(() => null), new Promise((r) => setTimeout(r, 4000))]);
  return true;
}

/** One run: tick every 30 s for ~4.5 min, then hand over to the next run if still needed. */
export async function runTicker({ sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)), runMs = RUN_MS, fetcher, poll }: {
  sleep?: (ms: number) => Promise<unknown>; runMs?: number; fetcher?: typeof fetch; poll?: () => Promise<unknown>;
} = {}) {
  const started = Date.now();
  let ticks = 0, sent = 0;
  for (;;) {
    ticks++;
    await writeSettings({ [KEY]: new Date(Date.now() + 90_000).toISOString() });
    if (poll) await poll().catch(() => null);
    sent += (await sendNudges()).sent;
    await sendFollowUpReminders().catch(() => null);
    if (!(await needsTicker())) {
      await writeSettings({ [KEY]: null });
      return { ticks, sent, next: false };
    }
    if (Date.now() - started + TICK_MS > runMs) break;
    await sleep(TICK_MS);
  }
  // still someone waiting: start the next run before this one ends
  await writeSettings({ [KEY]: null });
  await kickTicker(fetcher);
  return { ticks, sent, next: true };
}
