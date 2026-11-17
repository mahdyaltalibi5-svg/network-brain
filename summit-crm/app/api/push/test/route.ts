import { withBase } from "@/lib/base";
import { notifyAll, pushReady } from "@/lib/push";

/** Sends a sample lead alert to every device with alerts on (signed-in only, see proxy.ts). */
export async function POST() {
  if (!pushReady()) return Response.json({ error: "Alerts aren't set up on the server." }, { status: 503 });
  const r = await notifyAll({
    title: "New lead from your Instagram ad",
    body: "Test alert: this is what a new lead looks like.\nTap to open Today.",
    url: withBase("/now"),
    tag: "test-alert",
  });
  return Response.json(r);
}
