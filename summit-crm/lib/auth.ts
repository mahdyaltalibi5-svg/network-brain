/**
 * Single-user sign-in: one password (CRM_PASSWORD), and a session cookie of
 * `<expiry>.<HMAC-SHA256(expiry)>` signed with CRM_SESSION_SECRET. Web Crypto only, so
 * proxy.ts can verify it before any page renders.
 */
export const SESSION_COOKIE = "crm_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (hash both sides so lengths can't leak). */
export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([hmac("cmp", a), hmac("cmp", b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function createSession(secret: string, now = Date.now()) {
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${await hmac(secret, exp)}`;
}

export async function verifySession(token: string | undefined, secret: string | undefined, now = Date.now()) {
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(secret, exp));
}
