import { safeEqual } from "@/lib/auth";
import { config } from "@/lib/config";
import { sendFollowUpReminders } from "@/lib/followups";
import { sendNudges } from "@/lib/speed";

/** Reminder alerts for leads still waiting. Called every few minutes with Bearer CRON_SECRET. */
export async function GET(request: Request) {
  const cron = config.cronSecret();
  // Bearer header, or ?key= for schedulers that can only call a URL.
  const given = request.headers.get("authorization") ?? `Bearer ${new URL(request.url).searchParams.get("key") ?? ""}`;
  if (!cron || !(await safeEqual(given, `Bearer ${cron}`))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const speed = await sendNudges();
  const followUps = await sendFollowUpReminders();
  return Response.json({ ok: true, ...speed, followUps: followUps.sent });
}
