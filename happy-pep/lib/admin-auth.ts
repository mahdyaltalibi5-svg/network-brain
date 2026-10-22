import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Admin login: one email + password, set as ADMIN_EMAIL and ADMIN_PASSWORD in
// the environment (never in code). ADMIN_SESSION_SECRET signs the session cookie.
const COOKIE = "hp_admin";
const TTL_SECONDS = 7 * 24 * 60 * 60;

export const adminConfigured = () => Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD is not set.");
  return s;
}

const sign = (exp: number) => createHmac("sha256", secret()).update(`hp-admin.${exp}`).digest("base64url");
const digest = (s: string) => createHash("sha256").update(s).digest();

export function credentialsMatch(email: string, password: string) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return false;
  // Compare both, always, so timing doesn't reveal which one was wrong.
  const emailOk = timingSafeEqual(digest(email.trim().toLowerCase()), digest(ADMIN_EMAIL.trim().toLowerCase()));
  const passwordOk = timingSafeEqual(digest(password), digest(ADMIN_PASSWORD));
  return emailOk && passwordOk;
}

export async function startSession() {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  // Read the cookie first so this always runs per request (never prerendered).
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  if (!adminConfigured()) return false;
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Call at the top of every admin page and server action.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
