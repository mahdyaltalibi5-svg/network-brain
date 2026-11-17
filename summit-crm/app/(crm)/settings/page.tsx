import type { Metadata } from "next";
import { headers } from "next/headers";
import { AlertsToggle } from "@/components/AlertsToggle";
import { ImportLeads } from "@/components/ImportLeads";
import { SyncButton } from "@/components/SyncButton";
import { MetaAppForm } from "@/components/MetaAppForm";
import { withBase } from "@/lib/base";
import { config, integrations } from "@/lib/config";
import { redirectUri, webhookUrl } from "@/lib/meta/connect";
import { metaCreds } from "@/lib/meta/creds";
import { secretStatus } from "@/lib/secrets";
import { subscriptionCount } from "@/lib/push";
import { disconnectAction } from "./actions";
import { stages } from "@/lib/stages";

export const metadata: Metadata = { title: "Settings" };

const longDate = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/Denver", month: "long", day: "numeric", year: "numeric" });

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ meta?: string }> }) {
  await headers(); // request-time page
  const flash = (await searchParams).meta;
  const m = await metaCreds();
  const connected = !!(m.connectedAt && m.pageToken);
  const host = new URL(config.publicUrl()).hostname.replace(/^www\./, "");
  // The public address (summitcustomsuits.com/portal), whichever host this request came through.
  const origin = config.publicUrl();
  const list = integrations(m, await secretStatus());
  const devices = await subscriptionCount();

  return (
    <>
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 font-display text-4xl">Connections</h1>
      <p className="mt-2 max-w-2xl text-sm text-ivory-dim">Connect Meta once below and leads, ad spend and conversion events flow on their own.</p>

      <section aria-labelledby="meta-h" id="meta" className="card mt-8 p-5 md:p-7" data-testid="meta-connect">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="meta-h" className="font-display text-3xl">Meta</h2>
            <p className="mt-1 text-sm text-ivory-dim">Facebook &amp; Instagram lead forms, ad spend and the Conversions API.</p>
          </div>
          <span className={`pill ${connected ? "!text-ok" : "!text-warn"}`}>{connected ? "Connected" : "Not connected"}</span>
        </div>

        {flash && (
          <p role="status" className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${flash === "connected" ? "border-ok/40 text-ok" : flash === "partial" ? "border-warn/40 text-warn" : "border-bad/40 text-bad"}`}>
            {flash === "connected" ? "Meta is connected. New form leads now come straight in." : flash === "partial" ? "Connected, with a few parts to fix. See below." : flash}
          </p>
        )}

        {connected ? (
          <>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Facebook Page", m.pageName ?? m.pageId],
                ["Ad account", m.adAccountName ?? m.adAccountId],
                ["Pixel / dataset", m.pixelId],
                ["Instagram", m.igUsername ? `@${m.igUsername}` : null],
                ["Signed in as", m.userName],
              ] as const).map(([k, v]) => (
                <div key={k} className="tile !p-4"><dt className="text-xs text-stone">{k}</dt><dd className="mt-1 break-words">{v ?? "—"}</dd></div>
              ))}
            </dl>
            {m.log.length > 0 && (
              <ul className="mt-5 space-y-2 text-sm" aria-label="Connection checks">
                {m.log.map((s) => (
                  <li key={s.step} className="flex gap-3">
                    <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.ok ? "bg-ok" : "bg-warn"}`} />
                    <span><span className="text-ivory">{s.step}</span> <span className="text-ivory-dim">· {s.detail}</span>{!s.ok && <span className="sr-only"> (needs attention)</span>}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-stone">
              {m.lastPollAt ? `Last checked for new leads ${m.lastPollAt.toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. ` : ""}
              {m.userTokenExpiresAt ? `Facebook asks you to sign in again by ${longDate(m.userTokenExpiresAt)}; you'll get a reminder a week before. Form leads keep arriving either way.` : ""}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <SyncButton />
              <a href={withBase("/api/meta/connect")} className="btn-ghost">Reconnect</a>
              <form action={disconnectAction}><button className="btn-ghost !text-stone hover:!text-bad">Disconnect</button></form>
            </div>
          </>
        ) : (
          <ol className="mt-6 space-y-6">
            <li className="grid gap-2 sm:grid-cols-[2rem_1fr] [&>*]:min-w-0">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-gold/50 text-xs text-gold">1</span>
              <div>
                <p className="font-medium">Create the Meta app (one time, about 3 minutes)</p>
                <ol className="mt-2 list-[lower-alpha] space-y-1.5 pl-5 text-sm text-ivory-dim">
                  <li>Signed in to Facebook as the account that manages the Summit Page and ad account, open <a className="text-gold underline-offset-2 hover:underline" href="https://developers.facebook.com/apps/creation/" target="_blank" rel="noopener">developers.facebook.com/apps/creation</a>.</li>
                  <li>Name it <span className="text-ivory">Summit CRM</span>. For use case choose <span className="text-ivory">Other</span>, then app type <span className="text-ivory">Business</span>, and pick the Summit business portfolio.</li>
                  <li>On the app dashboard, add <span className="text-ivory">Facebook Login for Business</span> (or Facebook Login) → Settings, and paste this under <span className="text-ivory">Valid OAuth Redirect URIs</span>: <code className="code mt-1 break-all">{redirectUri()}</code></li>
                  <li>Also add the <span className="text-ivory">Messenger</span> and <span className="text-ivory">Instagram</span> products (Instagram: “API setup with Facebook login”), so Facebook and Instagram DMs come in as leads. On the phone, in Instagram → Settings → Messages and story replies → Message controls, turn on <span className="text-ivory">Allow access to messages</span>.</li>
                  <li>App settings → Basic: set <span className="text-ivory">App domains</span> to <code className="text-ivory">{host}</code>, add a Privacy Policy URL (<code className="break-all text-ivory">https://www.{host}/privacy</code>), and save.</li>
                </ol>
              </div>
            </li>
            <li className="grid gap-2 sm:grid-cols-[2rem_1fr] [&>*]:min-w-0">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-gold/50 text-xs text-gold">2</span>
              <div>
                <p className="font-medium">Paste the App ID and App secret {m.appId && <span className="text-sm text-ok">· saved{m.appName ? ` (${m.appName})` : ""}</span>}</p>
                <p className="mt-1 text-sm text-ivory-dim">App settings → Basic. The secret is stored encrypted and never shown again.</p>
                <div className="mt-3"><MetaAppForm appId={m.appId} /></div>
              </div>
            </li>
            <li className="grid gap-2 sm:grid-cols-[2rem_1fr] [&>*]:min-w-0">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-gold/50 text-xs text-gold">3</span>
              <div>
                <p className="font-medium">Connect</p>
                <p className="mt-1 text-sm text-ivory-dim">Sign in with Facebook and allow everything it asks for. The CRM then sets up the lead webhook, finds the Page, ad account and pixel, and imports the last 30 days of leads.</p>
                {m.appId && m.appSecret ? (
                  <a href={withBase("/api/meta/connect")} className="btn mt-3">Connect with Facebook</a>
                ) : (
                  <p className="mt-3 text-sm text-stone">Save the app in step 2 first.</p>
                )}
              </div>
            </li>
          </ol>
        )}
      </section>

      <ul className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((i) => (
          <li key={i.name} className="tile !p-5">
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
          <p className="mt-3 text-sm text-ivory-dim" data-testid="alert-devices">
            {devices ? `Lead alerts are on for ${devices} device${devices === 1 ? "" : "s"}.` : "No device has lead alerts on yet. Turn them on from Kobe’s phone."}{" "}
            Every new lead from a Facebook or Instagram ad, an Instagram or Facebook message, or the website sends one.
          </p>
        </div>
      </section>

      <section aria-labelledby="nudge-h" className="mt-10 max-w-3xl" id="reminders">
        <h2 id="nudge-h" className="font-display text-2xl">Reminders while a lead waits</h2>
        <p className="mt-2 text-sm text-ivory-dim">
          If nobody has called, texted or emailed a new lead, the phone is reminded at {config.nudgeMinutes().join(", ")} minutes. Something has to check every few
          minutes: create a free job at <span className="text-ivory">cron-job.org</span> that opens this address every 5 minutes.
        </p>
        {config.cronSecret() ? (
          <code className="code mt-3">{`${origin}/api/speed/nudge?key=${config.cronSecret()}`}</code>
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

      <section aria-labelledby="setup-h" className="mt-10 max-w-3xl">
        <h2 id="setup-h" className="font-display text-2xl">Meta details</h2>
        <ul className="mt-4 space-y-2 text-sm text-ivory-dim">
          <li>Lead webhook address (set up automatically): <code className="break-all text-gold">{webhookUrl()}</code></li>
          <li>Website leads: the booking page posts to <code className="break-all text-gold">{origin}/api/leads</code>.</li>
          <li>In Events Manager, open the dataset → <span className="text-ivory">CRM integration / Conversion Leads</span> and pick the stage Meta should optimise for.</li>
        </ul>
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
