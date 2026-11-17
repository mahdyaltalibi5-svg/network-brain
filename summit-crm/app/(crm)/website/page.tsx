import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Sparkles } from "lucide-react";
import { AgentChat } from "@/components/AgentChat";
import { SecretField } from "@/components/SecretsForm";
import { WebsiteForm } from "@/components/WebsiteForm";
import { recentSessions } from "@/lib/agent/store";
import { config } from "@/lib/config";
import { when } from "@/lib/format";
import { secretStatus } from "@/lib/secrets";
import { readSettings, recentChanges } from "@/lib/site";

export const metadata: Metadata = { title: "Website" };

const statusLabel: Record<string, string> = { publishing: "Publishing", live: "Live", failed: "Failed" };
const sessionLabel: Record<string, [string, string]> = {
  idle: ["Ready to review", "text-warn"],
  working: ["Working", "text-warn"],
  published: ["Published", "text-ok"],
  discarded: ["Discarded", "text-stone"],
  failed: ["Failed", "text-bad"],
};

export default async function WebsitePage() {
  await connection();
  const keys = await secretStatus();
  const ready = keys.github && keys.vercel;
  const agentReady = ready && keys.anthropic;
  let settings = null, error: string | null = null;
  if (ready) {
    try {
      settings = (await readSettings()).settings;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  const [history, sessions] = await Promise.all([recentChanges(8), recentSessions(8)]);

  return (
    <>
      <p className="eyebrow">Website</p>
      <h1 className="mt-2 font-display text-4xl">summitcustomsuits.com</h1>
      <p className="mt-2 max-w-2xl text-sm text-ivory-dim">
        Ask for any change in your own words. The agent edits the site, you check the before and after, and one tap publishes it.
      </p>

      <section aria-labelledby="agent-h" className="card mt-8 max-w-3xl p-5 md:p-6">
        <h2 id="agent-h" className="flex items-center gap-2 font-display text-2xl"><Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />Ask for a change</h2>
        {agentReady ? (
          <div className="mt-4"><AgentChat /></div>
        ) : (
          <div className="mt-4 space-y-6" data-testid="agent-setup">
            <p className="text-sm text-ivory-dim">Three keys connect the agent (one time). Each is stored encrypted and never shown again.</p>
            <SecretField
              name="anthropic"
              label="Claude API key"
              saved={keys.anthropic}
              help={<>At <a className="text-gold hover:underline" href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com → API keys</a>, create a key named “Summit website agent” (add a few dollars of credit under Billing). A typical change costs a few cents to about a dollar.</>}
            />
            <SecretField
              name="github"
              label="GitHub token"
              saved={keys.github}
              help={<>GitHub → Settings → Developer settings → <span className="text-ivory">Fine-grained tokens</span> → Generate. Repository access: only <code className="text-ivory">{config.site.repo()}</code>; permission <span className="text-ivory">Contents: Read and write</span>.</>}
            />
            <SecretField
              name="vercel"
              label="Vercel token"
              saved={keys.vercel}
              help={<>Vercel → Account Settings → <span className="text-ivory">Tokens</span> → Create, scoped to the team that hosts the site.</>}
            />
          </div>
        )}
      </section>

      {sessions.length > 0 && (
        <section aria-labelledby="req-h" className="mt-10 max-w-3xl">
          <h2 id="req-h" className="font-display text-2xl">Recent requests</h2>
          <ul className="card mt-3 divide-y divide-white/8 text-sm">
            {sessions.map((s) => {
              const [lbl, cls] = sessionLabel[s.status] ?? [s.status, "text-stone"];
              return (
                <li key={s.id}>
                  <Link href={`/website/agent/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[.03]">
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className={`shrink-0 text-xs ${cls}`}>{lbl}</span>
                    <span className="hidden shrink-0 text-xs text-stone sm:inline">{when(s.updatedAt)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {error && <p role="alert" className="card mt-8 p-4 text-sm text-bad">Couldn&rsquo;t read the current website settings: {error}</p>}
      {settings && (
        <section aria-labelledby="details-h" className="mt-12">
          <h2 id="details-h" className="font-display text-2xl">Business details</h2>
          <p className="mt-1 max-w-2xl text-sm text-ivory-dim">The quick way to change the phone number, email, hours or announcement bar on every page.</p>
          <WebsiteForm settings={settings} siteUrl={config.site.url()} />
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="hist-h" className="mt-12 max-w-3xl">
          <h2 id="hist-h" className="font-display text-2xl">Published changes</h2>
          <ul className="card mt-3 divide-y divide-white/8 px-5 text-sm">
            {history.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span className="min-w-0 break-words">{c.summary}</span>
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
