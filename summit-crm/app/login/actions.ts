"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, createSession, safeEqual } from "@/lib/auth";
import { config } from "@/lib/config";

export type LoginState = { error?: string };

/** Only same-site paths are allowed after sign-in, never another origin. */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const password = config.password();
  const secret = config.sessionSecret();
  if (!password || !secret) return { error: "Sign-in isn't set up: add CRM_PASSWORD and CRM_SESSION_SECRET." };
  // Slow every attempt a little to blunt password guessing.
  await new Promise((r) => setTimeout(r, 400));
  if (!(await safeEqual(String(form.get("password") ?? ""), password))) return { error: "That password isn't right." };
  (await cookies()).set(SESSION_COOKIE, await createSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
