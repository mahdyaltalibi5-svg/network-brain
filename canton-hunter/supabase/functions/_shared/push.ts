import { db, must, type Row } from "./db.ts";
import { envOpt } from "./env.ts";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Send an Expo push to team members (optionally excluding one user). Never throws on delivery errors. */
export async function pushTeam(msg: PushMessage, opts: { exclude?: string | null } = {}): Promise<number> {
  const profiles = must(await db().from("profiles").select("id,expo_push_token").is("deleted_at", null), "profiles") as Row[];
  const tokens = profiles
    .filter((p) => p.expo_push_token && p.id !== opts.exclude)
    .map((p) => p.expo_push_token as string);
  if (!tokens.length) return 0;
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const token = envOpt("EXPO_ACCESS_TOKEN");
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers,
    body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", title: msg.title, body: msg.body, data: msg.data ?? {} }))),
  });
  if (!res.ok) console.error("expo push failed", res.status, await res.text());
  return tokens.length;
}
