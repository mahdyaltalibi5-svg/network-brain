"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publishSession, undoChange } from "@/lib/agent/publish";
import { getSession, saveSession, unstageFile } from "@/lib/agent/store";
import { getDb } from "@/lib/db";
import { saveSecret, SECRETS, type SecretName } from "@/lib/secrets";
import { publish, type SiteChange, type SiteSettings } from "@/lib/site";

export type PublishState = { errors?: string[]; change?: SiteChange };

export async function publishAction(_: PublishState, form: FormData): Promise<PublishState> {
  const v = (k: string) => String(form.get(k) ?? "");
  const settings: SiteSettings = {
    announcement: { enabled: form.get("annOn") === "on", text: v("annText"), link: v("annLink"), linkText: v("annLinkText") },
    phone: v("phone"),
    email: v("email"),
    hours: { days: v("days"), daysShort: v("daysShort"), open: v("open"), close: v("close") },
  };
  try {
    const r = await publish(settings);
    revalidatePath("/website");
    return r.ok ? { change: r.change } : { errors: r.errors };
  } catch (e) {
    return { errors: [e instanceof Error ? e.message : String(e)] };
  }
}

/* ── Website agent ─────────────────────────────────────────────────────────────────────────────── */

export type AgentActionState = { error?: string; change?: SiteChange };

export async function publishAgentAction(_: AgentActionState, form: FormData): Promise<AgentActionState> {
  try {
    const change = await publishSession(String(form.get("id")));
    revalidatePath("/website", "layout");
    return { change };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function discardAgentAction(form: FormData) {
  const id = String(form.get("id"));
  const s = await getSession(id);
  if (s && s.status !== "published") {
    const db = await getDb();
    await db.query(`DELETE FROM agent_files WHERE session_id = $1`, [id]);
    await saveSession(id, { status: "discarded" });
  }
  revalidatePath("/website", "layout");
  redirect("/website");
}

export async function unstageAgentFileAction(form: FormData) {
  const id = String(form.get("id"));
  const s = await getSession(id);
  if (s && s.status !== "published" && s.status !== "working") await unstageFile(id, String(form.get("path")));
  revalidatePath(`/website/agent/${id}`);
}

export async function undoChangeAction(_: AgentActionState, form: FormData): Promise<AgentActionState> {
  try {
    const change = await undoChange(String(form.get("change")));
    revalidatePath("/website", "layout");
    return { change };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export type SecretState = { error?: string; ok?: string };
export async function saveSecretAction(_: SecretState, form: FormData): Promise<SecretState> {
  const name = String(form.get("name")) as SecretName;
  if (!(name in SECRETS)) return { error: "Unknown key." };
  try {
    await saveSecret(name, String(form.get("value") ?? ""));
    revalidatePath("/", "layout");
    return { ok: `${SECRETS[name].label} saved.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
