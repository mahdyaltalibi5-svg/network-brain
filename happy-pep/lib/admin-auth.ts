import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Single-password admin login. Set ADMIN_PASSWORD (and optionally a separate
// ADMIN_SESSION_SECRET) in your environment. Sessions are signed cookies.
const COOKIE = "hp_admin";
const TTL_SECONDS = 7 * 24 * 60 * 60;

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD is not set.");
  return s;
}

const sign = (exp: number) => createHmac("sha256", secret()).update(`hp-admin.${exp}`).digest("base64url");
const digest = (s: string) => createHash("sha256").update(s).digest();

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
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
