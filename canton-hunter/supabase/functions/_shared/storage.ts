import { encodeBase64 } from "@std/encoding/base64";
import { db } from "./db.ts";

export const MEDIA_BUCKET = "media";

export async function downloadBase64(path: string, bucket = MEDIA_BUCKET): Promise<{ data: string; mime: string }> {
  const { data, error } = await db().storage.from(bucket).download(path);
  if (error || !data) throw new Error(`download ${path}: ${error?.message ?? "no data"}`);
  const buf = new Uint8Array(await data.arrayBuffer());
  return { data: encodeBase64(buf), mime: data.type || guessMime(path) };
}

export async function signedUrl(path: string, seconds = 3600, bucket = MEDIA_BUCKET): Promise<string> {
  const { data, error } = await db().storage.from(bucket).createSignedUrl(path, seconds);
  if (error || !data) throw new Error(`sign ${path}: ${error?.message}`);
  return data.signedUrl;
}

export function guessMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext === "png" ? "image/png" : ext === "mp4" ? "video/mp4" : ext === "mov" ? "video/quicktime"
    : ext === "m4a" ? "audio/mp4" : "image/jpeg";
}
