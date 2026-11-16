import { touchLead, type Channel } from "@/lib/speed";

/**
 * Logs a call/text/email the moment the button is tapped (sent with sendBeacon, so it lands
 * even as the phone switches to the dialer). The first one stops the speed-to-lead clock.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let channel: unknown;
  try {
    channel = (JSON.parse(await request.text()) as { channel?: unknown }).channel;
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  if (channel !== "call" && channel !== "text" && channel !== "email") return Response.json({ error: "Bad channel" }, { status: 400 });
  try {
    const minutes = await touchLead(id, channel as Channel);
    return Response.json({ ok: true, firstResponseMinutes: minutes });
  } catch {
    return Response.json({ error: "Lead not found" }, { status: 404 });
  }
}
