import type { Metadata } from "next";
import { headers } from "next/headers";
import { AlertsToggle } from "@/components/AlertsToggle";
import { ImportLeads } from "@/components/ImportLeads";
import { SyncButton } from "@/components/SyncButton";
import { config, integrations } from "@/lib/config";
import { stages } from "@/lib/stages";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await headers(); // request-time page
  // The public address (summitcustomsuits.com/portal), whichever host this request came through.
  const origin = config.publicUrl();
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

      <section aria-labelledby="app-h" className="mt-10 max-w-3xl" id="app">
        <h2 id="app-h" className="font-display text-2xl">Phone app &amp; lead alerts</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ivory-dim">
          <li>On the phone, open <code className="break-all text-gold">{origin}</code> and sign in.</li>
          <li>
            iPhone (Safari): Share → <span className="text-ivory">Add to Home Screen</span>. Android (Chrome): menu → <span className="text-ivory">Install app</span>.
          </li>
          <li>Open <span className="text-ivory">Summit</span> from the home screen and turn alerts on below. Do the same on the laptop if you want alerts there too.</li>
        </ol>
        <div className="mt-4">
          <AlertsToggle publicKey={config.push.publicKey()} />
        </div>
      </section>

      <section aria-labelledby="nudge-h" className="mt-10 max-w-3xl" id="reminders">
        <h2 id="nudge-h" className="font-display text-2xl">Reminders while a lead waits</h2>
        <p className="mt-2 text-sm text-ivory-dim">
          If nobody has called, texted or emailed a new lead, the phone is reminded at {config.nudgeMinutes().join(", ")} minutes. Something has to check every few
          minutes: create a free job at <span className="text-ivory">cron-job.org</span> that opens this address every 5 minutes.
        </p>
        {config.cronSecret() ? (
          <code className="mt-3 block break-all border border-line-soft bg-surface-2 p-3 text-xs text-gold">{`${origin}/api/speed/nudge?key=${config.cronSecret()}`}</code>
        ) : (
          <p className="mt-3 text-sm text-warn">Set CRON_SECRET first.</p>
        )}
        <p className="mt-2 text-xs text-stone">Keep this address private: it can only send reminders, but it shouldn&rsquo;t be shared.</p>
      </section>

      <section aria-labelledby="import-h" className="mt-10" id="import">
        <h2 id="import-h" className="font-display text-2xl">Import a lead file from Meta</h2>
        <p className="mt-2 max-w-2xl text-sm text-ivory-dim">
          Works without any Meta keys. In Ads Manager, click the number under <span className="text-ivory">Results</span> for the campaign → <span className="text-ivory">Download</span>{" "}
          (or Meta Business Suite → <span className="text-ivory">Leads Center</span> → Export), then upload the file here. Leads already in the CRM are skipped, so re-uploading is safe.
        </p>
        <div className="mt-4">
          <ImportLeads />
        </div>
      </section>

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
