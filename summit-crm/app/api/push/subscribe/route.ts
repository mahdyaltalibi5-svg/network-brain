import { removeSubscription, saveSubscription, type PushSub } from "@/lib/push";

/** Registers this device for lead alerts (signed-in only; see proxy.ts). */
export async function POST(request: Request) {
  const { subscription, label } = (await request.json().catch(() => ({}))) as { subscription?: PushSub; label?: string };
  if (!subscription?.endpoint?.startsWith("https://") || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }
  await saveSubscription(subscription, label?.slice(0, 80));
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await removeSubscription(endpoint);
  return Response.json({ ok: true });
}
