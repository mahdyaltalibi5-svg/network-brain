import { config } from "./config";
import { getDb } from "./db";

/**
 * Settings saved from inside the CRM (the Meta connection), in the app_settings table.
 * Secrets are sealed with AES-GCM under a key derived from CRM_SESSION_SECRET, so a database
 * dump alone doesn't reveal tokens.
 */
const PREFIX = "v1:";

async function key() {
  const secret = config.sessionSecret() ?? (process.env.VERCEL ? undefined : "local-dev-only-secret");
  if (!secret) throw new Error("CRM_SESSION_SECRET is required to store secrets");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`summit-vault:${secret}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

export async function seal(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return PREFIX + b64(out);
}

export async function unseal(sealed: string) {
  if (!sealed.startsWith(PREFIX)) throw new Error("Not a sealed value");
  const buf = unb64(sealed.slice(PREFIX.length));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, await key(), buf.slice(12));
  return new TextDecoder().decode(pt);
}

/** Every setting whose key starts with `prefix`, secrets unsealed (unreadable ones are skipped). */
export async function readSettings(prefix: string): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.query<{ key: string; value: string }>(`SELECT key, value FROM app_settings WHERE key LIKE $1`, [`${prefix}%`]);
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (!r.value.startsWith(PREFIX)) out[r.key] = r.value;
    else {
      try {
        out[r.key] = await unseal(r.value);
      } catch {
        // sealed with a different CRM_SESSION_SECRET: treat as not set
      }
    }
  }
  return out;
}

/** Saves settings; `secret: true` entries are encrypted. A null value deletes the key. */
export async function writeSettings(values: Record<string, string | null>, secrets: string[] = []) {
  const db = await getDb();
  for (const [k, v] of Object.entries(values)) {
    if (v == null) {
      await db.query(`DELETE FROM app_settings WHERE key = $1`, [k]);
      continue;
    }
    const stored = secrets.includes(k) ? await seal(v) : v;
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [k, stored],
    );
  }
}
