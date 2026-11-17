import { getDb } from "../db";
import { deploy, getChange } from "../site";
import { commitFiles } from "./repo";
import { getSession, saveSession, stagedFiles } from "./store";

/** Commits a session's staged files in one commit and deploys the site. */
export async function publishSession(sessionId: string) {
  const s = await getSession(sessionId);
  if (!s) throw new Error("That request no longer exists.");
  if (s.status === "published") throw new Error("Already published.");
  if (s.status === "working") throw new Error("The agent is still working on this.");
  const files = await stagedFiles(sessionId);
  if (!files.length) throw new Error("There are no changes to publish yet.");
  const db = await getDb();
  const id = crypto.randomUUID();
  const summary = s.title;
  await db.query(`INSERT INTO site_changes (id, summary, settings, files) VALUES ($1, $2, '{}', $3)`, [id, summary, JSON.stringify(files.map((f) => f.path))]);
  try {
    const sha = await commitFiles(files, `Website (via Summit CRM agent): ${summary}`);
    const dep = await deploy(sha);
    await db.query(`UPDATE site_changes SET commit_sha = $2, deployment_id = $3 WHERE id = $1`, [id, sha, dep]);
    await saveSession(sessionId, { status: "published", changeId: id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.query(`UPDATE site_changes SET status = 'failed', error = $2 WHERE id = $1`, [id, msg]);
    throw new Error(msg);
  }
  return (await getChange(id))!;
}

/** Puts back exactly what a published agent change replaced (new files are removed). */
export async function undoChange(changeId: string) {
  const db = await getDb();
  const row = (await db.query<{ id: string; summary: string }>(`SELECT id, summary FROM site_changes WHERE id = $1`, [changeId]))[0];
  const sess = (await db.query<{ id: string }>(`SELECT id FROM agent_sessions WHERE change_id = $1`, [changeId]))[0];
  if (!row || !sess) throw new Error("Only changes made by the website agent can be undone here.");
  const files = await stagedFiles(sess.id);
  const id = crypto.randomUUID();
  const summary = `Undo: ${row.summary}`;
  await db.query(`INSERT INTO site_changes (id, summary, settings, files, revert_of) VALUES ($1, $2, '{}', $3, $4)`, [id, summary, JSON.stringify(files.map((f) => f.path)), changeId]);
  try {
    const sha = await commitFiles(files.map((f) => ({ path: f.path, original: f.content, content: f.original })), `Website (via Summit CRM): ${summary}`);
    const dep = await deploy(sha);
    await db.query(`UPDATE site_changes SET commit_sha = $2, deployment_id = $3 WHERE id = $1`, [id, sha, dep]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.query(`UPDATE site_changes SET status = 'failed', error = $2 WHERE id = $1`, [id, msg]);
    throw new Error(msg);
  }
  return (await getChange(id))!;
}
