import { cookies } from "next/headers";
import { SESSION_COOKIE, safeEqual, verifySession } from "@/lib/auth";
import { config } from "@/lib/config";
import { upsertLead } from "@/lib/leads";
import { fetchRecentLeads, fromMetaLead } from "@/lib/meta/leadgen";

/**
 * Pulls every Instant Form lead from the last `days` days (default 3) and imports any the
 * webhook missed. Runs daily from Vercel Cron (Bearer CRON_SECRET), or from the
 * "Sync now" button while signed in.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const cron = config.cronSecret();
  const byCron = !!cron && (await safeEqual(auth, `Bearer ${cron}`));
  const bySession = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, config.sessionSecret());
  if (!byCron && !bySession) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 3));
  try {
    const leads = await fetchRecentLeads(Math.floor(Date.now() / 1000) - days * 86_400);
    let created = 0;
    for (const l of leads) if ((await upsertLead(fromMetaLead(l))).created) created++;
    return Response.json({ ok: true, days, fetched: leads.length, created });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
