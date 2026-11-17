"use server";

import { revalidatePath } from "next/cache";
import { disconnect, saveApp } from "@/lib/meta/connect";

export type AppState = { error?: string; ok?: string };

export async function saveAppAction(_prev: AppState, form: FormData): Promise<AppState> {
  try {
    const app = await saveApp(String(form.get("appId") ?? ""), String(form.get("appSecret") ?? ""), String(form.get("configId") ?? ""));
    revalidatePath("/settings");
    return { ok: `Saved ${app.name ?? app.id}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function disconnectAction() {
  await disconnect();
  revalidatePath("/", "layout");
}
