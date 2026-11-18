import { metaCreds } from "./creds";
import { graph, graphAll } from "./graph";
import { leadFormIds } from "./leadgen";

/**
 * Checks and tests Meta's instant lead delivery (webhooks):
 * - what the app is subscribed to, and which Pages have the app subscribed for `leadgen`;
 * - a real end-to-end test: Meta creates a test lead on one of the ads' forms, which should
 *   reach /api/meta/webhook within seconds.
 */
type Page = { id: string; name: string; access_token: string };

export async function instantStatus() {
  const m = await metaCreds();
  if (!m.appId || !m.appSecret || !m.userToken) throw new Error("Meta isn't connected");
  const app = `${m.appId}|${m.appSecret}`;
  const out: Record<string, unknown> = { lastWebhookAt: m.lastWebhookAt ?? null, webhookError: m.webhookError ?? null };
  try {
    const subs = await graph<{ data: { object: string; callback_url: string; active: boolean; fields: { name: string }[] }[] }>(`${m.appId}/subscriptions`, { token: app });
    out.app_subscriptions = subs.data.map((s) => ({ object: s.object, active: s.active, callback: s.callback_url, fields: s.fields.map((f) => f.name) }));
  } catch (e) {
    out.app_subscriptions = `error: ${e instanceof Error ? e.message : String(e)}`;
  }
  try {
    const a = await graph<Record<string, unknown>>(m.appId, { token: app, params: { fields: "name,link,category" } });
    out.app = a;
  } catch {}
  const pages = await graphAll<Page>("me/accounts", { token: m.userToken, params: { fields: "id,name,access_token", limit: "100" } });
  out.pages = await Promise.all(
    pages.map(async (p) => {
      try {
        const r = await graph<{ data: { id: string; name?: string; subscribed_fields?: string[] }[] }>(`${p.id}/subscribed_apps`, { token: p.access_token });
        const mine = r.data.find((x) => x.id === m.appId);
        return { page: p.name, id: p.id, subscribed: !!mine, fields: mine?.subscribed_fields ?? [] };
      } catch (e) {
        return { page: p.name, id: p.id, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return out;
}

/** Asks Meta to create a test lead on the first form the ads use. Returns when it was created. */
export async function createTestLead() {
  const m = await metaCreds();
  if (!m.userToken) throw new Error("Meta isn't connected");
  const forms = await leadFormIds();
  if (!forms.length) throw new Error("No lead forms found on the ads");
  const form = forms[0];
  const info = await graph<{ page?: { id: string } }>(form, { token: m.userToken, params: { fields: "page{id}" } });
  const pages = await graphAll<Page>("me/accounts", { token: m.userToken, params: { fields: "id,name,access_token", limit: "100" } });
  const page = pages.find((p) => p.id === info.page?.id);
  const token = page?.access_token ?? m.userToken;
  // A form holds one test lead at a time: remove the previous one first.
  const existing = await graph<{ data: { id: string }[] }>(`${form}/test_leads`, { token }).catch(() => ({ data: [] }));
  for (const t of existing.data) await graph(t.id, { token, method: "DELETE" }).catch(() => null);
  const created = await graph<{ id: string }>(`${form}/test_leads`, { token, method: "POST" });
  return { form, page: page?.name ?? info.page?.id, testLeadId: created.id, at: new Date().toISOString() };
}
