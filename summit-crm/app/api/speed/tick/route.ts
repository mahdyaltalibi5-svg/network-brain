import { after } from "next/server";
import { safeEqual } from "@/lib/auth";
import { config } from "@/lib/config";
import { pollLeads } from "@/lib/meta/connect";
import { runTicker } from "@/lib/ticker";

/** Starts one ticker run in the background (see lib/ticker.ts). Called by the CRM itself, with the cron key. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const cron = config.cronSecret();
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!cron || !(await safeEqual(key, cron))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  after(() => runTicker({ poll: () => pollLeads({ minIntervalMs: 25_000 }) }).catch((e) => console.error("speed ticker", e)));
  return Response.json({ ok: true, started: true }, { status: 202 });
}
