import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { structuredPatch } from "diff";
import { ArrowLeft, FileCode2, Trash2, Undo2 } from "lucide-react";
import { AgentChat } from "@/components/AgentChat";
import { AgentPublish, PublishedStatus } from "@/components/AgentPublish";
import { getSession, stagedFiles } from "@/lib/agent/store";
import { transcript } from "@/lib/agent/transcript";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { when } from "@/lib/format";
import { getChange } from "@/lib/site";
import { discardAgentAction, unstageAgentFileAction } from "../../actions";

export const metadata: Metadata = { title: "Website change" };

const friendly = (p: string) =>
  ({
    "summit-suit-src/build.py": "Pages (build.py)",
    "summit-suit-src/content.py": "Journal, FAQ & areas (content.py)",
    "summit-suit-src/home.html": "Home page (home.html)",
    "summit-suit-src/site.json": "Phone, email, hours & announcement",
    "summit-suit-src/fabrics.json": "Fabric catalog",
    "summit-suit/assets/site.css": "Site styles",
    "summit-suit/assets/site.js": "Site scripts",
    "summit-suit/assets/film.css": "Home film styles",
    "summit-suit/assets/film.js": "Home film script",
  })[p] ?? p;

export default async function AgentSessionPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const s = await getSession(id);
  if (!s) notFound();
  const files = await stagedFiles(id);
  const change = s.changeId ? await getChange(s.changeId) : null;
  const db = await getDb();
  const undone = s.changeId ? (await db.query(`SELECT 1 FROM site_changes WHERE revert_of = $1 LIMIT 1`, [s.changeId])).length > 0 : false;
  const closed = s.status === "published" || s.status === "discarded";
  const siteUrl = config.site.url();

  return (
    <div className="space-y-6">
      <Link href="/website" className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-ivory"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Website</Link>
      <div>
        <p className="eyebrow">Website agent · {when(s.createdAt)}</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl">{s.title}</h1>
        <p className="mt-1 text-xs text-stone">About ${(s.costCents / 100).toFixed(2)} of Claude usage so far.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] [&>*]:min-w-0">
        <section aria-label="Conversation" className="card p-4 md:p-5">
          <AgentChat key={s.updatedAt.toISOString()} sessionId={s.id} initial={transcript(s.messages)} closed={closed} />
          {s.error && <p role="alert" className="mt-3 text-sm text-bad">{s.error}</p>}
          {s.status === "working" && <p className="mt-3 text-sm text-warn">The agent is still working on this. Refresh in a moment.</p>}
        </section>

        <section aria-labelledby="changes-h" className="space-y-4">
          <div className="card p-4 md:p-5">
            <h2 id="changes-h" className="font-display text-2xl">
              {s.status === "published" ? "Published" : s.status === "discarded" ? "Discarded" : files.length ? "Review & publish" : "Changes"}
            </h2>
            {s.status === "discarded" ? (
              <p className="mt-2 text-sm text-ivory-dim">Nothing from this request went to the website.</p>
            ) : !files.length ? (
              <p className="mt-2 text-sm text-ivory-dim">No changes yet. Once the agent edits something, the before and after appear here.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-ivory-dim">
                  {s.status === "published" ? "These changes went to the website." : "Check the changes below. Nothing is live until you publish; the site rebuilds in about a minute."}
                </p>
                <div className="mt-4">
                  {change ? <PublishedStatus change={change} siteUrl={siteUrl} canUndo={!undone && change.status !== "failed"} /> : !closed && <AgentPublish id={s.id} siteUrl={siteUrl} />}
                </div>
                {!closed && (
                  <form action={discardAgentAction} className="mt-3">
                    <input type="hidden" name="id" value={s.id} />
                    <button className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-bad"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Discard these changes</button>
                  </form>
                )}
              </>
            )}
          </div>

          {files.map((f) => {
            const patch = structuredPatch(f.path, f.path, f.original ?? "", f.content, "", "", { context: 2 });
            const added = patch.hunks.reduce((n, h) => n + h.lines.filter((l) => l.startsWith("+")).length, 0);
            const removed = patch.hunks.reduce((n, h) => n + h.lines.filter((l) => l.startsWith("-")).length, 0);
            return (
              <article key={f.path} className="card overflow-hidden" data-testid="agent-file">
                <header className="flex flex-wrap items-center gap-2 border-b border-white/8 px-4 py-3">
                  <FileCode2 className="h-4 w-4 text-gold" aria-hidden="true" />
                  <h3 className="text-sm font-medium">{friendly(f.path)}</h3>
                  <span className="text-xs text-ok">+{added}</span>
                  <span className="text-xs text-bad">−{removed}</span>
                  {f.original === null && <span className="pill">new file</span>}
                  {!closed && (
                    <form action={unstageAgentFileAction} className="ml-auto">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="path" value={f.path} />
                      <button className="inline-flex items-center gap-1 text-xs text-stone hover:text-ivory" aria-label={`Undo the changes to ${friendly(f.path)}`}><Undo2 className="h-3.5 w-3.5" aria-hidden="true" />Undo file</button>
                    </form>
                  )}
                </header>
                <div className="max-h-[28rem] overflow-auto text-xs leading-relaxed">
                  {patch.hunks.map((h, i) => (
                    <div key={i} className="border-b border-white/5 last:border-0">
                      <p className="bg-white/[.03] px-4 py-1 font-mono text-[11px] text-stone">Line {h.newStart}</p>
                      <pre className="font-mono">
                        {h.lines.map((l, j) => (
                          <span
                            key={j}
                            className={`block px-4 break-all whitespace-pre-wrap ${l.startsWith("+") ? "bg-ok/10 text-ok" : l.startsWith("-") ? "bg-bad/10 text-bad line-through decoration-bad/40" : "text-ivory-dim"}`}
                          >
                            {l || " "}
                          </span>
                        ))}
                      </pre>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
