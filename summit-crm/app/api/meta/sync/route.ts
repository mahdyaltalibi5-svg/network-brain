import { cookies } from "next/headers";
import { SESSION_COOKIE, safeEqual, verifySession } from "@/lib/auth";
import { config } from "@/lib/config";
import { syncAds } from "@/lib/meta/ads-sync";
import { pollLeads } from "@/lib/meta/connect";

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
    // a manual or multi-week import is a backfill: no flood of alerts (the daily 3-day check still alerts)
    const r = await pollLeads({ days, force: true, alert: days > 3 ? "never" : "always" });
    if (r.skipped) return Response.json({ ok: false, error: "Meta isn't connected: connect Facebook in Settings" }, { status: 409 });
    let ads: unknown = null, adsError: string | undefined;
    try {
      ads = await syncAds({ force: true, days: Math.max(7, days) });
    } catch (e) {
      adsError = e instanceof Error ? e.message : String(e);
    }
    return Response.json({ ok: true, days, fetched: r.fetched, created: r.created, ads, adsError });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
