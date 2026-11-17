import { config } from "../config";
import { gh } from "../site";

/**
 * The website agent's view of the repository, through the GitHub API. It can read the site's
 * source (the generator and its content, the home page template, styles and scripts) and
 * change it. The generated HTML in summit-suit/*.html is rebuilt on every deploy, so it's
 * read-only: editing it would be thrown away.
 */
const EDITABLE = [
  /^summit-suit-src\/(?!__pycache__\/)[\w.-]+\.(py|html|json|mjs|txt|md)$/,
  /^summit-suit\/assets\/(site|film)\.(css|js)$/,
];
const READABLE = [...EDITABLE, /^summit-suit\/[\w.-]+\.(html|txt|xml)$/, /^summit-suit\/journal\/[\w.-]+\.html$/, /^summit-suit\/vercel\.json$/];
export const IMAGE_DIR = /^summit-suit\/img\/[\w.-]+\.(webp|jpg|jpeg|png|avif|svg)$/;

export const canEdit = (p: string) => EDITABLE.some((r) => r.test(p));
export const canRead = (p: string) => READABLE.some((r) => r.test(p));

const branch = () => config.site.branch();

export async function headSha() {
  const r = await gh<{ object: { sha: string } }>(`git/ref/heads/${branch()}`);
  return r.object.sha;
}

type TreeEntry = { path: string; type: string; size?: number; sha: string };

export async function tree(sha: string) {
  const r = await gh<{ tree: TreeEntry[]; truncated: boolean }>(`git/trees/${sha}?recursive=1`);
  return r.tree.filter((e) => e.type === "blob");
}

/** Raw file text at a commit, or null if it doesn't exist. */
export async function readAt(path: string, sha: string): Promise<string | null> {
  try {
    const r = await gh<{ content?: string; encoding?: string; size: number; sha: string }>(`contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${sha}`);
    if (r.content && r.encoding === "base64") return Buffer.from(r.content, "base64").toString("utf8");
    // files over 1 MB: fetch the blob
    const b = await gh<{ content: string }>(`git/blobs/${r.sha}`);
    return Buffer.from(b.content, "base64").toString("utf8");
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("GitHub 404")) return null;
    throw e;
  }
}

/** content null deletes the file. */
export type FileChange = { path: string; original: string | null; content: string | null };

/**
 * Commits several files at once on top of the branch head. Refuses if any of those files
 * changed on the branch since the agent read them, so nobody's work is overwritten.
 */
export async function commitFiles(changes: FileChange[], message: string) {
  const head = await headSha();
  for (const c of changes) {
    const now = await readAt(c.path, head);
    if (now !== c.original) throw new Error(`${c.path} changed on the website since this edit started. Start a new request so the agent works from the latest version.`);
  }
  const base = await gh<{ tree: { sha: string } }>(`git/commits/${head}`);
  const t = await gh<{ sha: string }>(`git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: base.tree.sha,
      tree: changes.map((c) => (c.content === null ? { path: c.path, mode: "100644", type: "blob", sha: null } : { path: c.path, mode: "100644", type: "blob", content: c.content })),
    }),
  });
  const author = { name: "Summit CRM", email: "crm@summitcustomsuits.com" };
  const commit = await gh<{ sha: string }>(`git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: t.sha, parents: [head], author, committer: author }),
  });
  await gh(`git/refs/heads/${branch()}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha;
}
