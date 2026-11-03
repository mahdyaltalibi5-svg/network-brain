import type { Metadata } from "next";
import { headers } from "next/headers";
import { SyncButton } from "@/components/SyncButton";
import { config, integrations } from "@/lib/config";
import { stages } from "@/lib/stages";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const list = integrations();
  const syncReady = list.find((i) => i.name === "Lead sync")?.ready;

  return (
    <>
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 font-display text-4xl">Connections</h1>
      <p className="mt-2 max-w-2xl text-sm text-ivory-dim">
        Each part switches on when its environment variables are set in the Vercel project (Settings → Environment Variables), then redeploy.
      </p>

      <ul className="mt-8 grid gap-px border border-line-soft bg-line-soft md:grid-cols-2 xl:grid-cols-3">
        {list.map((i) => (
          <li key={i.name} className="bg-void p-5">
            <p className="flex items-center gap-2 font-medium">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${i.ready ? "bg-ok" : "bg-warn"}`} />
              {i.name}
              <span className={`ml-auto text-xs ${i.ready ? "text-ok" : "text-warn"}`}>{i.ready ? "Connected" : "Not set up"}</span>
            </p>
            <p className="mt-2 text-sm text-ivory-dim">{i.what}</p>
            {!i.ready && <p className="mt-2 text-xs text-stone">Needs: {i.missing.join(", ")}</p>}
          </li>
        ))}
      </ul>

      <section aria-labelledby="sync-h" className="mt-10">
        <h2 id="sync-h" className="font-display text-2xl">Import leads from Meta</h2>
        <p className="mt-2 max-w-2xl text-sm text-ivory-dim">
          New leads arrive by webhook within seconds. This also runs every morning, and you can run it any time to backfill the last 30 days.
        </p>
        <div className="mt-4">
          <SyncButton disabled={!syncReady} />
        </div>
      </section>

      <section aria-labelledby="setup-h" className="mt-10 max-w-3xl">
        <h2 id="setup-h" className="font-display text-2xl">Meta setup</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-ivory-dim">
          <li>
            In <span className="text-ivory">Meta for Developers</span>, create a Business app and add the <span className="text-ivory">Webhooks</span> product.
          </li>
          <li>
            Subscribe the <span className="text-ivory">Page</span> object to the <code className="text-ivory">leadgen</code> field. Callback URL:{" "}
            <code className="break-all text-gold">{origin}/api/meta/webhook</code>, verify token: the value of <code>META_VERIFY_TOKEN</code>.
          </li>
          <li>
            Generate a long-lived <span className="text-ivory">Page access token</span> with <code>leads_retrieval</code>, <code>pages_manage_ads</code>,{" "}
            <code>pages_show_list</code> and <code>pages_read_engagement</code>, and subscribe the app to the Page (
            <code>POST /{config.meta.pageId() ?? "{page-id}"}/subscribed_apps?subscribed_fields=leadgen</code>).
          </li>
          <li>
            In <span className="text-ivory">Events Manager</span>, open the dataset (Pixel) → Settings → Conversions API → Generate access token. Set{" "}
            <code>META_PIXEL_ID</code> and <code>META_CAPI_TOKEN</code>. Then in the dataset, set up <span className="text-ivory">CRM integration / Conversion Leads</span> and choose the stage to optimise for.
          </li>
          <li>
            For ad spend, create a <span className="text-ivory">system user</span> in Business Settings with <code>ads_read</code> on the ad account and set{" "}
            <code>META_AD_ACCOUNT_ID</code> and <code>META_ADS_ACCESS_TOKEN</code>.
          </li>
          <li>
            Website leads: the booking page posts to <code className="break-all text-gold">{origin}/api/leads</code>.
          </li>
        </ol>
        <h3 className="mt-8 font-display text-xl">Events sent to Meta for each stage</h3>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {stages.map((s) => (
              <tr key={s.id} className="border-b border-line-soft">
                <th scope="row" className="py-2 text-left font-normal text-ivory-dim">
                  {s.label}
                </th>
                <td className="py-2 text-right font-mono text-xs text-gold">{s.metaEvent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
