// Synchronous API for the app (requires a signed-in team member's JWT).
//   { action: "media_sign", path }            -> signed upload URL for a media file
//   { action: "translate", text, to }         -> quick translation (EN <-> 中文)
//   { action: "photo_query", image_base64 }   -> search keywords for "search by photo"
import { z } from "zod";
import { PhotoQuery } from "@core";
import { extract, image, text } from "../_shared/claude.ts";
import { db } from "../_shared/db.ts";
import { MEDIA_BUCKET } from "../_shared/storage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

const Translation = z.object({
  translation: z.string(),
  pinyin: z.string().nullable().describe("Pinyin if the translation is Chinese, else null"),
});

const MEDIA_PATH = /^finds\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|mp4|mov|m4a)$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!jwt) return json({ error: "no auth" }, 401);
  const sb = db();
  const { data: user, error: authErr } = await sb.auth.getUser(jwt);
  if (authErr || !user.user) return json({ error: "bad auth" }, 401);
  const { data: profile } = await sb.from("profiles").select("id").eq("id", user.user.id).is("deleted_at", null).maybeSingle();
  if (!profile) return json({ error: "not a team member" }, 403);

  try {
    const body = await req.json();
    switch (body.action) {
      case "media_sign": {
        const path = String(body.path ?? "");
        if (!MEDIA_PATH.test(path)) return json({ error: "bad path" }, 400);
        const { data, error } = await sb.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path, { upsert: true });
        if (error) return json({ error: error.message }, 500);
        return json({ signedUrl: data.signedUrl, token: data.token, path: data.path });
      }
      case "translate": {
        const to = body.to === "en" ? "English" : "Simplified Chinese";
        const { data } = await extract({
          system: `Translate for a buyer talking to a supplier at the Canton Fair. Translate into ${to}. Keep it short, polite and natural for spoken trade conversation. Numbers and units stay exact.`,
          content: [text(String(body.text ?? "").slice(0, 2000))],
          schema: Translation,
          effort: "low",
          maxTokens: 4000,
        });
        return json(data);
      }
      case "photo_query": {
        const { data } = await extract({
          system: "Describe the main product in the photo as 3-8 plain English search keywords (what it is, material, key feature). No brand guesses.",
          content: [image(String(body.image_base64), String(body.media_type ?? "image/jpeg")), text("Keywords:")],
          schema: PhotoQuery,
          effort: "low",
          maxTokens: 2000,
        });
        return json(data);
      }
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
