import type Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../db";

export type AgentStatus = "idle" | "working" | "published" | "discarded" | "failed";
export type AgentSession = {
  id: string;
  title: string;
  status: AgentStatus;
  baseSha: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  summary: string | null;
  changeId: string | null;
  error: string | null;
  costCents: number;
  createdAt: Date;
  updatedAt: Date;
};
export type StagedFile = { path: string; original: string | null; content: string };

const toSession = (r: Record<string, unknown>): AgentSession => ({
  id: String(r.id),
  title: String(r.title),
  status: r.status as AgentStatus,
  baseSha: String(r.base_sha),
  messages: (typeof r.messages === "string" ? JSON.parse(r.messages) : r.messages) as Anthropic.Beta.BetaMessageParam[],
  summary: (r.summary as string) ?? null,
  changeId: (r.change_id as string) ?? null,
  error: (r.error as string) ?? null,
  costCents: Number(r.cost_cents ?? 0),
  createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  updatedAt: r.updated_at instanceof Date ? r.updated_at : new Date(String(r.updated_at)),
});

export async function createSession(title: string, baseSha: string) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO agent_sessions (id, title, base_sha) VALUES ($1, $2, $3)`, [id, title.slice(0, 120), baseSha]);
  return (await getSession(id))!;
}

export async function getSession(id: string) {
  const db = await getDb();
  const r = (await db.query(`SELECT * FROM agent_sessions WHERE id = $1`, [id]))[0];
  return r ? toSession(r) : null;
}

export async function recentSessions(limit = 12) {
  const db = await getDb();
  return (await db.query(`SELECT * FROM agent_sessions ORDER BY updated_at DESC LIMIT $1`, [limit])).map(toSession);
}

export async function saveSession(id: string, patch: Partial<Pick<AgentSession, "status" | "messages" | "summary" | "changeId" | "error">> & { addCents?: number }) {
  const db = await getDb();
  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [id];
  const add = (col: string, v: unknown) => {
    params.push(v);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.status) add("status", patch.status);
  if (patch.messages) add("messages", JSON.stringify(patch.messages));
  if (patch.summary !== undefined) add("summary", patch.summary);
  if (patch.changeId !== undefined) add("change_id", patch.changeId);
  if (patch.error !== undefined) add("error", patch.error);
  if (patch.addCents) {
    params.push(Math.round(patch.addCents));
    sets.push(`cost_cents = cost_cents + $${params.length}`);
  }
  await db.query(`UPDATE agent_sessions SET ${sets.join(", ")} WHERE id = $1`, params);
}

export async function stagedFiles(sessionId: string): Promise<StagedFile[]> {
  const db = await getDb();
  return (await db.query<{ path: string; original: string | null; content: string }>(`SELECT path, original, content FROM agent_files WHERE session_id = $1 ORDER BY path`, [sessionId])).map((r) => ({
    path: r.path,
    original: r.original,
    content: r.content,
  }));
}

export async function stageFile(sessionId: string, f: StagedFile) {
  const db = await getDb();
  if (f.original !== null && f.content === f.original) {
    await db.query(`DELETE FROM agent_files WHERE session_id = $1 AND path = $2`, [sessionId, f.path]); // back to unchanged
    return;
  }
  await db.query(
    `INSERT INTO agent_files (session_id, path, original, content) VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, path) DO UPDATE SET content = EXCLUDED.content`,
    [sessionId, f.path, f.original, f.content],
  );
}

export async function unstageFile(sessionId: string, path: string) {
  const db = await getDb();
  await db.query(`DELETE FROM agent_files WHERE session_id = $1 AND path = $2`, [sessionId, path]);
}
