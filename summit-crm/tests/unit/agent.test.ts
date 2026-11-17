import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ── A scripted Claude: each stream() call returns the next canned response ─────────────────── */
type Block = { type: string; [k: string]: unknown };
const script: { content: Block[]; stop_reason: string }[] = [];
const requests: { messages: unknown[]; tools: { name: string; eager_input_streaming?: boolean }[]; fallbacks?: unknown; model: string }[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error { status = 500; }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    beta = {
      messages: {
        stream: (params: (typeof requests)[number]) => {
          requests.push(JSON.parse(JSON.stringify(params)));
          const next = script.shift();
          if (!next) throw new Error("script ran out");
          const handlers: ((d: string) => void)[] = [];
          return {
            on: (_: string, fn: (d: string) => void) => handlers.push(fn),
            finalMessage: async () => {
              for (const b of next.content) if (b.type === "text") handlers.forEach((h) => h(String(b.text)));
              return { ...next, usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } };
            },
          };
        },
      },
    };
  }
  return { default: Anthropic };
});

import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { publishSession, undoChange } from "@/lib/agent/publish";
import { runAgent, type AgentEvent } from "@/lib/agent/run";
import { createSession, getSession, stagedFiles } from "@/lib/agent/store";
import { transcript } from "@/lib/agent/transcript";
import { saveSecret } from "@/lib/secrets";

/* ── A fake GitHub repo (one branch) and Vercel ─────────────────────────────────────────────── */
const BUILD = "page('suits',\n  hero(crumbs, 'Suits', 'Custom suits<br><em>made for you.</em>', 'Lede.'))\n";
let files: Record<string, string>;
let commits: { sha: string; files: Record<string, string> }[];
let head: string;
let deployments: string[];

function fakeNetwork() {
  files = { "summit-suit-src/build.py": BUILD, "summit-suit-src/site.json": "{}\n", "summit-suit/index.html": "<h1>Home</h1>", "summit-suit/img/client-trio-1100.webp": "" };
  commits = [{ sha: "c0", files: { ...files } }];
  head = "c0";
  deployments = [];
  const trees = new Map<string, Record<string, string>>();
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
    const at = (sha: string) => commits.find((c) => c.sha === sha)?.files;
    if (url.hostname === "api.vercel.com") {
      deployments.push(body.gitSource.sha);
      return json({ id: `dpl_${deployments.length}` });
    }
    const p = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+\//, "");
    if (p.startsWith("git/ref/heads/")) return json({ object: { sha: head } });
    if (p.startsWith("git/trees/") && method === "GET") {
      const f = at(p.split("/")[2])!;
      return json({ tree: Object.keys(f).map((path) => ({ path, type: "blob", size: f[path].length, sha: path })), truncated: false });
    }
    if (p.startsWith("contents/")) {
      const path = decodeURIComponent(p.slice("contents/".length));
      const f = at(url.searchParams.get("ref")!)!;
      if (!(path in f)) return json({ message: "Not Found" }, 404);
      return json({ content: Buffer.from(f[path]).toString("base64"), encoding: "base64", size: f[path].length, sha: path });
    }
    if (p.startsWith("git/commits/") && method === "GET") return json({ tree: { sha: `tree-${p.split("/")[2]}` } });
    if (p === "git/trees" && method === "POST") {
      const base = { ...at(body.base_tree.replace("tree-", ""))! };
      for (const e of body.tree) if (e.sha === null) delete base[e.path]; else base[e.path] = e.content;
      const id = `t${trees.size + 1}`;
      trees.set(id, base);
      return json({ sha: id });
    }
    if (p === "git/commits" && method === "POST") {
      expect(body.parents).toEqual([head]);
      const sha = `c${commits.length}`;
      commits.push({ sha, files: trees.get(body.tree)! });
      return json({ sha });
    }
    if (p.startsWith("git/refs/heads/") && method === "PATCH") {
      expect(p).toBe("git/refs/heads/claude/relaxed-lovelace-jrt1qj"); // slashes kept, not %2F
      head = body.sha;
      return json({ object: { sha: head } });
    }
    return json({ message: `unexpected ${method} ${p}` }, 400);
  });
}

let db: Db;
beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  vi.stubEnv("CRM_SESSION_SECRET", "unit-test-session-secret-unit-test");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("GITHUB_TOKEN", "");
  vi.stubEnv("VERCEL_TOKEN", "");
  script.length = 0;
  requests.length = 0;
  fakeNetwork();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setDb(undefined);
  await db.close();
});

const use = (id: string, name: string, input: unknown): Block => ({ type: "tool_use", id, name, input });

describe("website agent", () => {
  it("needs the Claude key, stages edits, publishes them in one commit, and can undo", async () => {
    const s = await createSession("Change the suits headline", "c0");
    await expect(runAgent(s.id, "hi", () => {})).rejects.toThrow(/Claude API key/);

    await saveSecret("anthropic", "sk-ant-api03-" + "x".repeat(30));
    await saveSecret("github", "github_pat_" + "y".repeat(30));
    await saveSecret("vercel", "v".repeat(24));

    script.push(
      { stop_reason: "tool_use", content: [{ type: "text", text: "Let me find it." }, use("t1", "search", { query: "made for you" })] },
      {
        stop_reason: "tool_use",
        content: [
          use("t2", "edit_file", { path: "summit-suit/index.html", old_text: "Home", new_text: "Hi" }), // generated: refused
          use("t3", "edit_file", { path: "summit-suit-src/build.py", old_text: "Custom suits<br><em>made for you.</em>", new_text: "Suits cut<br><em>for you alone.</em>" }),
        ],
      },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Done: the suits page headline now reads “Suits cut for you alone.” Review it and tap Publish." }] },
    );
    const events: AgentEvent[] = [];
    await runAgent(s.id, "Change the suits headline to Suits cut for you alone", (e) => events.push(e));

    // tools are streamed with eager input, and refusal fallbacks are on
    expect(requests[0].model).toBe("claude-opus-5-5");
    expect(requests[0].fallbacks).toBe("default");
    expect(requests[0].tools.find((t) => t.name === "edit_file")?.eager_input_streaming).toBe(true);
    // the search result reached Claude, and the generated file was refused
    const second = JSON.stringify(requests[1].messages);
    expect(second).toContain("summit-suit-src/build.py:2");
    const third = JSON.stringify(requests[2].messages);
    expect(third).toContain("can't be edited");
    expect(events.filter((e) => e.type === "tool").map((e) => (e as { label: string }).label)).toEqual([
      "Searching for “made for you”",
      "Editing index.html",
      "Editing build.py",
    ]);
    expect(events.at(-1)).toEqual({ type: "done" });

    const staged = await stagedFiles(s.id);
    expect(staged.map((f) => f.path)).toEqual(["summit-suit-src/build.py"]);
    expect(staged[0].content).toContain("Suits cut<br><em>for you alone.</em>");
    expect(files["summit-suit-src/build.py"]).toBe(BUILD); // nothing committed yet

    const after = (await getSession(s.id))!;
    expect(after.status).toBe("idle");
    expect(after.costCents).toBeGreaterThan(0);
    expect(transcript(after.messages).map((i) => i.role)).toEqual(["user", "agent", "step", "step", "step", "agent"]);

    const change = await publishSession(s.id);
    expect(change.summary).toBe("Change the suits headline");
    expect(head).toBe("c1");
    expect(commits[1].files["summit-suit-src/build.py"]).toContain("for you alone");
    expect(commits[1].files["summit-suit-src/site.json"]).toBe("{}\n"); // untouched files kept
    expect(deployments).toEqual(["c1"]);
    expect((await getSession(s.id))!.status).toBe("published");
    await expect(publishSession(s.id)).rejects.toThrow(/Already published/);

    await undoChange(change.id);
    expect(commits[2].files["summit-suit-src/build.py"]).toBe(BUILD);
    expect(deployments).toEqual(["c1", "c2"]);
  });

  it("won't overwrite a file that changed on the site since the agent read it", async () => {
    await saveSecret("anthropic", "sk-ant-api03-" + "x".repeat(30));
    await saveSecret("github", "github_pat_" + "y".repeat(30));
    await saveSecret("vercel", "v".repeat(24));
    const s = await createSession("Tweak", "c0");
    script.push(
      { stop_reason: "tool_use", content: [use("t1", "edit_file", { path: "summit-suit-src/build.py", old_text: "Lede.", new_text: "New lede." })] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Done." }] },
    );
    await runAgent(s.id, "Change the lede", () => {});
    // someone else changes build.py on the branch
    commits.push({ sha: "c1", files: { ...files, "summit-suit-src/build.py": BUILD + "# edited elsewhere\n" } });
    head = "c1";
    await expect(publishSession(s.id)).rejects.toThrow(/changed on the website since/);
    expect(deployments).toEqual([]);
  });
});
