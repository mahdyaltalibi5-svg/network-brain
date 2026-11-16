import { config } from "./config";
import { getDb } from "./db";

/**
 * Website editing. The live site (summitcustomsuits.com) is generated from the repository; its
 * business details live in one file, summit-suit-src/site.json. Publishing a change commits that
 * file to GitHub, then asks Vercel to deploy the commit; Vercel re-runs the generator, which fills
 * the new details into every page. Nothing else in the site can be touched from here.
 */
export type SiteSettings = {
  announcement: { enabled: boolean; text: string; link: string; linkText: string };
  phone: string;
  email: string;
  hours: { days: string; daysShort: string; open: string; close: string };
};

export const siteReady = () => !!(config.site.githubToken() && config.site.vercelToken());

const TIME = /^\d{1,2}(:\d{2})?\s?(am|pm)$/i;

/** Trims and checks a form submission. Returns the cleaned settings or a list of problems. */
export function validateSettings(input: SiteSettings): { ok: true; settings: SiteSettings } | { ok: false; errors: string[] } {
  const t = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const s: SiteSettings = {
    announcement: {
      enabled: !!input.announcement?.enabled,
      text: t(input.announcement?.text, 140),
      link: t(input.announcement?.link, 300),
      linkText: t(input.announcement?.linkText, 40),
    },
    phone: t(input.phone, 40),
    email: t(input.email, 120).toLowerCase(),
    hours: { days: t(input.hours?.days, 60), daysShort: t(input.hours?.daysShort, 30), open: t(input.hours?.open, 10).toLowerCase(), close: t(input.hours?.close, 10).toLowerCase() },
  };
  const errors: string[] = [];
  const digits = s.phone.replace(/\D/g, "");
  if (digits.length !== 10 && !(digits.length === 11 && digits.startsWith("1"))) errors.push("Phone must be a 10-digit US number, e.g. (801) 866-9718.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errors.push("Email doesn't look right.");
  if (!s.hours.days || !s.hours.daysShort) errors.push("Fill in both versions of the days, e.g. “Monday to Saturday” and “Mon–Sat”.");
  if (!TIME.test(s.hours.open) || !TIME.test(s.hours.close)) errors.push("Times should look like 10am or 9:30am.");
  if (s.announcement.enabled && !s.announcement.text) errors.push("Write the announcement, or switch it off.");
  if (s.announcement.link && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(s.announcement.link)) errors.push("Announcement link must start with / (a page on the site) or https://.");
  return errors.length ? { ok: false, errors } : { ok: true, settings: s };
}

/** Human summary of what changed, for the commit message and the history list. */
export function describeChange(before: SiteSettings, after: SiteSettings): string {
  const out: string[] = [];
  const a0 = before.announcement, a1 = after.announcement;
  if (!a0.enabled && a1.enabled) out.push(`announcement on: “${a1.text}”`);
  else if (a0.enabled && !a1.enabled) out.push("announcement off");
  else if (a1.enabled && (a0.text !== a1.text || a0.link !== a1.link || a0.linkText !== a1.linkText)) out.push(`announcement: “${a1.text}”`);
  if (before.phone !== after.phone) out.push(`phone ${after.phone}`);
  if (before.email !== after.email) out.push(`email ${after.email}`);
  const h0 = before.hours, h1 = after.hours;
  if (h0.days !== h1.days || h0.daysShort !== h1.daysShort || h0.open !== h1.open || h0.close !== h1.close) out.push(`hours ${h1.days}, ${h1.open}–${h1.close}`);
  return out.join("; ");
}

/* ── GitHub ───────────────────────────────────────────────────────────────────────────────────── */
async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${config.site.repo()}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.site.githubToken()}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const j = (await res.json().catch(() => null)) as T & { message?: string };
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${j?.message ?? res.statusText}`);
  return j;
}

export async function readSettings(): Promise<{ settings: SiteSettings; sha: string }> {
  const f = await gh<{ content: string; sha: string }>(`contents/${config.site.settingsPath()}?ref=${encodeURIComponent(config.site.branch())}`);
  return { settings: JSON.parse(Buffer.from(f.content, "base64").toString("utf8")), sha: f.sha };
}

async function commitSettings(settings: SiteSettings, sha: string, message: string) {
  const r = await gh<{ commit: { sha: string } }>(`contents/${config.site.settingsPath()}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(settings, null, 2) + "\n", "utf8").toString("base64"),
      sha,
      branch: config.site.branch(),
      committer: { name: "Summit CRM", email: "crm@summitcustomsuits.com" },
    }),
  });
  return r.commit.sha;
}

/* ── Vercel ───────────────────────────────────────────────────────────────────────────────────── */
async function vc<T>(path: string, init: RequestInit = {}): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${path}${sep}teamId=${config.site.vercelTeamId()}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.site.vercelToken()}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const j = (await res.json().catch(() => null)) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Vercel ${res.status}: ${j?.error?.message ?? res.statusText}`);
  return j;
}

async function deploy(sha: string) {
  const [org, repo] = config.site.repo().split("/");
  const d = await vc<{ id: string }>(`/v13/deployments`, {
    method: "POST",
    body: JSON.stringify({
      name: config.site.vercelProject(),
      project: config.site.vercelProject(),
      target: "production",
      gitSource: { type: "github", org, repo, ref: config.site.branch(), sha },
    }),
  });
  return d.id;
}

export async function deploymentState(id: string): Promise<"building" | "live" | "failed"> {
  const d = await vc<{ readyState: string }>(`/v13/deployments/${id}`);
  return d.readyState === "READY" ? "live" : ["ERROR", "CANCELED"].includes(d.readyState) ? "failed" : "building";
}

/* ── Publishing ───────────────────────────────────────────────────────────────────────────────── */
export type SiteChange = { id: string; summary: string; status: string; error: string | null; createdAt: Date; commitSha: string | null };

export async function publish(input: SiteSettings): Promise<{ ok: true; change: SiteChange } | { ok: false; errors: string[] }> {
  if (!siteReady()) return { ok: false, errors: ["Website editing isn't connected yet (GITHUB_TOKEN and VERCEL_TOKEN)."] };
  const v = validateSettings(input);
  if (!v.ok) return v;
  const { settings: before, sha } = await readSettings();
  const summary = describeChange(before, v.settings);
  if (!summary) return { ok: false, errors: ["Nothing has changed."] };
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO site_changes (id, summary, settings) VALUES ($1, $2, $3)`, [id, summary, JSON.stringify(v.settings)]);
  try {
    const commit = await commitSettings(v.settings, sha, `Website (via Summit CRM): ${summary}`);
    const dep = await deploy(commit);
    await db.query(`UPDATE site_changes SET commit_sha = $2, deployment_id = $3 WHERE id = $1`, [id, commit, dep]);
  } catch (e) {
    await db.query(`UPDATE site_changes SET status = 'failed', error = $2 WHERE id = $1`, [id, e instanceof Error ? e.message : String(e)]);
  }
  return { ok: true, change: (await getChange(id))! };
}

const toChange = (r: Record<string, unknown>): SiteChange => ({
  id: String(r.id),
  summary: String(r.summary),
  status: String(r.status),
  error: (r.error as string) ?? null,
  createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  commitSha: (r.commit_sha as string) ?? null,
});

export async function getChange(id: string) {
  const db = await getDb();
  const r = (await db.query(`SELECT * FROM site_changes WHERE id = $1`, [id]))[0];
  return r ? toChange(r) : null;
}

/** Re-checks a change that's still publishing, and records the outcome. */
export async function refreshChange(id: string) {
  const db = await getDb();
  const r = (await db.query(`SELECT * FROM site_changes WHERE id = $1`, [id]))[0];
  if (!r) return null;
  if (r.status === "publishing" && r.deployment_id) {
    const st = await deploymentState(String(r.deployment_id)).catch(() => "building" as const);
    if (st !== "building") await db.query(`UPDATE site_changes SET status = $2 WHERE id = $1`, [id, st]);
  }
  return getChange(id);
}

export async function recentChanges(limit = 10) {
  const db = await getDb();
  return (await db.query(`SELECT * FROM site_changes ORDER BY created_at DESC LIMIT $1`, [limit])).map(toChange);
}
