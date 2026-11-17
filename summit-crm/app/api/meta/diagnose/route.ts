import { metaCreds } from "@/lib/meta/creds";
import { graph, graphAll } from "@/lib/meta/graph";

/**
 * Why aren't leads arriving? Signed-in only (proxy.ts). Returns counts and settings only, never
 * anyone's name or contact details: the Page's lead forms and how many leads each holds, and which
 * kind of "lead" Meta counts for each ad (Instant Form vs website Pixel vs messages).
 */
export const maxDuration = 60;

export async function GET() {
  const m = await metaCreds();
  if (!m.pageId || !m.pageToken || !m.adAccountId || !m.adsToken) return Response.json({ error: "Meta isn't connected" }, { status: 409 });
  const out: Record<string, unknown> = {};
  const err = (e: unknown) => (e instanceof Error ? e.message : String(e));

  try {
    const forms = await graphAll<{ id: string; name?: string; status?: string; leads_count?: number; created_time?: string }>(`${m.pageId}/leadgen_forms`, {
      token: m.pageToken,
      params: { fields: "id,name,status,leads_count,created_time", limit: "100" },
    });
    out.forms = await Promise.all(
      forms.map(async (f) => {
        let readable: number | string;
        try {
          readable = (await graph<{ data: unknown[] }>(`${f.id}/leads`, { token: m.pageToken!, params: { fields: "id,created_time", limit: "50" } })).data.length;
        } catch (e) {
          readable = `error: ${err(e)}`;
        }
        return { id: f.id, name: f.name, status: f.status, created: f.created_time, leads_count: f.leads_count, leads_readable_first_page: readable };
      }),
    );
  } catch (e) {
    out.forms = `error: ${err(e)}`;
  }

  try {
    const until = new Date();
    const since = new Date(until.getTime() - 90 * 86_400_000);
    const rows = await graphAll<{ ad_id: string; ad_name: string; campaign_name: string; objective?: string; actions?: { action_type: string; value: string }[] }>(`${m.adAccountId}/insights`, {
      token: m.adsToken,
      params: {
        level: "ad",
        time_range: JSON.stringify({ since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) }),
        fields: "ad_id,ad_name,campaign_name,objective,actions",
        limit: "200",
      },
    });
    out.ads = rows.map((r) => ({
      ad: r.ad_name,
      campaign: r.campaign_name,
      objective: r.objective,
      lead_actions: Object.fromEntries((r.actions ?? []).filter((a) => /lead|messag|contact|schedule|submit|complete_registration/i.test(a.action_type)).map((a) => [a.action_type, Number(a.value)])),
    }));
  } catch (e) {
    out.ads = `error: ${err(e)}`;
  }

  try {
    const ads = await graphAll<{ name: string; creative?: { object_story_spec?: { link_data?: { link?: string; call_to_action?: { type?: string; value?: { lead_gen_form_id?: string; link?: string } } }; video_data?: { call_to_action?: { type?: string; value?: { lead_gen_form_id?: string; link?: string } } } } } }>(
      `${m.adAccountId}/ads`,
      { token: m.adsToken, params: { fields: "name,creative{object_story_spec}", limit: "100" } },
    );
    out.destinations = ads.map((a) => {
      const s = a.creative?.object_story_spec;
      const cta = s?.link_data?.call_to_action ?? s?.video_data?.call_to_action;
      return { ad: a.name, cta: cta?.type, form: cta?.value?.lead_gen_form_id ?? null, link: cta?.value?.link ?? s?.link_data?.link ?? null };
    });
  } catch (e) {
    out.destinations = `error: ${err(e)}`;
  }
  // Each form the ads point to: can the Page token / Kobe's login read its leads?
  const formIds = [...new Set((Array.isArray(out.destinations) ? out.destinations : []).map((d: { form?: string | null }) => d.form).filter(Boolean))] as string[];
  const tokens: [string, string | undefined][] = [["page", m.pageToken], ["login", m.userToken]];
  out.ad_forms = await Promise.all(
    formIds.map(async (id) => {
      const row: Record<string, unknown> = { id };
      for (const [name, token] of tokens) {
        if (!token) continue;
        try {
          const f = await graph<{ name?: string; status?: string; leads_count?: number; page?: { id: string; name?: string } }>(id, { token, params: { fields: "name,status,leads_count,page{id,name}" } });
          row[`${name}_form`] = f;
        } catch (e) {
          row[`${name}_form`] = `error: ${err(e)}`;
        }
        try {
          row[`${name}_leads_readable`] = (await graph<{ data: unknown[] }>(`${id}/leads`, { token, params: { fields: "id", limit: "100" } })).data.length;
        } catch (e) {
          row[`${name}_leads_readable`] = `error: ${err(e)}`;
        }
      }
      return row;
    }),
  );
  return Response.json(out);
}
