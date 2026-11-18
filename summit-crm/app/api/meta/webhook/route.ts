import { metaCreds } from "@/lib/meta/creds";
import { upsertLead } from "@/lib/leads";
import { fetchLead, fromMetaLead, leadgenIds, verifySignature } from "@/lib/meta/leadgen";
import { writeSettings } from "@/lib/vault";

/**
 * Meta Lead Ads webhook (Page subscription, field "leadgen").
 * GET: the one-time verification handshake. POST: a new lead. The payload only carries the
 * lead's ID, so the full answers are fetched from the Graph API with the Page token.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const expected = (await metaCreds()).verifyToken;
  if (expected && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === expected) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const secret = (await metaCreds()).appSecret;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const raw = await request.text();
  if (!(await verifySignature(raw, request.headers.get("x-hub-signature-256"), secret))) {
    return new Response("Bad signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const changes = leadgenIds(payload);
  // Record that Meta's instant delivery works (shown on Settings, used by the diagnose check).
  if (changes.length) await writeSettings({ "meta.last_webhook_at": new Date().toISOString(), "meta.webhook_error": null }).catch(() => {});
  const results = [];
  for (const change of changes) {
    try {
      const { lead, created } = await upsertLead(fromMetaLead(await fetchLead(change.leadgen_id)), { alert: "always" });
      results.push({ leadgen_id: change.leadgen_id, id: lead.id, created });
    } catch (e) {
      // Still answer 200: Meta retries failed deliveries for hours, and the daily sync
      // backfills anything missed. The error is logged for the function logs.
      console.error("leadgen webhook: could not import", change.leadgen_id, e);
      results.push({ leadgen_id: change.leadgen_id, error: e instanceof Error ? e.message : String(e) });
      await writeSettings({ "meta.webhook_error": `${new Date().toISOString()} ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) }).catch(() => {});
    }
  }
  return Response.json({ ok: true, results }); // message events are ignored: DMs don't become leads
}
