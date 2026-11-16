import type { Metadata } from "next";
import { connection } from "next/server";
import { WebsiteForm } from "@/components/WebsiteForm";
import { config } from "@/lib/config";
import { when } from "@/lib/format";
import { readSettings, recentChanges, siteReady } from "@/lib/site";

export const metadata: Metadata = { title: "Website" };

const statusLabel: Record<string, string> = { publishing: "Publishing", live: "Live", failed: "Failed" };

export default async function WebsitePage() {
  await connection();
  const ready = siteReady();
  let settings = null, error: string | null = null;
  if (ready) {
    try {
      settings = (await readSettings()).settings;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  const history = await recentChanges(8);

  return (
    <>
      <p className="eyebrow">Website</p>
      <h1 className="mt-2 font-display text-4xl">summitcustomsuits.com</h1>
      <p className="mt-2 max-w-2xl text-sm text-ivory-dim">
        Update the details shown across the site. Publishing rebuilds every page with the new details, so phone numbers, hours and the
        information Google reads all stay in step.
      </p>

      {!ready && (
        <section className="card mt-8 max-w-3xl p-5">
          <h2 className="font-display text-2xl">Connect website editing</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ivory-dim">
            <li>
              On GitHub: Settings → Developer settings → <span className="text-ivory">Fine-grained tokens</span> → Generate. Repository access: only{" "}
              <code className="text-ivory">{config.site.repo()}</code>. Permissions: <span className="text-ivory">Contents: Read and write</span>. Save it in Vercel as{" "}
              <code>GITHUB_TOKEN</code>.
            </li>
            <li>
              On Vercel: Account Settings → <span className="text-ivory">Tokens</span> → Create, scoped to this team. Save it as <code>VERCEL_TOKEN</code>.
            </li>
            <li>Redeploy the CRM. This page then shows the editor.</li>
          </ol>
        </section>
      )}
      {error && <p role="alert" className="card mt-8 p-4 text-sm text-bad">Couldn&rsquo;t read the current website settings: {error}</p>}
      {settings && <WebsiteForm settings={settings} siteUrl={config.site.url()} />}

      {history.length > 0 && (
        <section aria-labelledby="hist-h" className="mt-12 max-w-3xl">
          <h2 id="hist-h" className="font-display text-2xl">Recent changes</h2>
          <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft text-sm">
            {history.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span>{c.summary}</span>
                <span className={c.status === "failed" ? "text-bad" : c.status === "live" ? "text-ok" : "text-warn"}>
                  {statusLabel[c.status] ?? c.status} · <span className="text-stone">{when(c.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
