import { safeEqual } from "@/lib/auth";
import { config } from "@/lib/config";
import { sendFollowUpReminders } from "@/lib/followups";
import { pollLeads, warnIfExpiring } from "@/lib/meta/connect";
import { sendNudges } from "@/lib/speed";

/** Reminder alerts for leads still waiting. Called every few minutes with Bearer CRON_SECRET. */
export async function GET(request: Request) {
  const cron = config.cronSecret();
  // Bearer header, or ?key= for schedulers that can only call a URL.
  const given = request.headers.get("authorization") ?? `Bearer ${new URL(request.url).searchParams.get("key") ?? ""}`;
  if (!cron || !(await safeEqual(given, `Bearer ${cron}`))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Pull new Meta form leads first (backs up the webhook), so they get alerts in this same run.
  let meta: { fetched: number; created: number; error?: string } = { fetched: 0, created: 0 };
  try {
    meta = await pollLeads();
    await warnIfExpiring();
  } catch (e) {
    meta = { fetched: 0, created: 0, error: e instanceof Error ? e.message : String(e) };
  }
  const speed = await sendNudges();
  const followUps = await sendFollowUpReminders();
  return Response.json({ ok: true, ...speed, followUps: followUps.sent, meta });
}
