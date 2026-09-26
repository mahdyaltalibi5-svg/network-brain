/**
 * Media files: saved into the app's documents folder the moment they're captured, then shrunk and
 * uploaded in the background. A file is never deleted automatically.
 */
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { api } from "./supabase";
import { get, patch, sqlite } from "./store";

export const MEDIA_DIR = new Directory(Paths.document, "media");
if (!MEDIA_DIR.exists) MEDIA_DIR.create({ intermediates: true });

const EXT: Record<string, string> = { "image/jpeg": "jpg", "video/mp4": "mp4", "video/quicktime": "mov" };

/** Move a freshly captured file (camera cache) into permanent storage. Fast: a rename, no re-encode. */
export function keepFile(tempUri: string, mediaId: string, mime: string): string {
  const src = new File(tempUri);
  const dest = new File(MEDIA_DIR, `${mediaId}.${EXT[mime] ?? "bin"}`);
  if (dest.exists) dest.delete();
  src.move(dest);
  return dest.uri;
}

/** Copy a kept file for another media row (e.g. reuse the last business card for "same booth"). */
export function copyFile(uri: string, mediaId: string, mime: string): string {
  const dest = new File(MEDIA_DIR, `${mediaId}.${EXT[mime] ?? "bin"}`);
  if (!dest.exists) new File(uri).copy(dest);
  return dest.uri;
}

export function registerFile(mediaId: string, uri: string, mime: string, kind: string) {
  sqlite.runSync("INSERT OR REPLACE INTO files (media_id, uri, mime, kind, state, resized) VALUES (?, ?, ?, ?, 'pending', ?)",
    mediaId, uri, mime, kind, mime.startsWith("image/") ? 0 : 1);
}

export function localUri(mediaId: string): string | null {
  const r = sqlite.getFirstSync<{ uri: string }>("SELECT uri FROM files WHERE media_id = ?", mediaId);
  return r?.uri ?? null;
}

export function uploadStats(): { pending: number; failed: number } {
  const r = sqlite.getFirstSync<{ p: number; f: number }>(
    "SELECT SUM(CASE WHEN state != 'uploaded' THEN 1 ELSE 0 END) AS p, SUM(CASE WHEN state = 'error' THEN 1 ELSE 0 END) AS f FROM files");
  return { pending: r?.p ?? 0, failed: r?.f ?? 0 };
}

interface FileRow { media_id: string; uri: string; mime: string; kind: string; state: string; resized: number; attempts: number }

/** Shrink photos to 1600px JPEG (~300 KB) in place. */
async function ensureResized(f: FileRow): Promise<FileRow> {
  if (f.resized || !f.mime.startsWith("image/")) return f;
  const ctx = ImageManipulator.manipulate(f.uri);
  ctx.resize({ width: 1600 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  const dest = new File(f.uri);
  const tmp = new File(out.uri);
  if (dest.exists) dest.delete();
  tmp.move(dest);
  sqlite.runSync("UPDATE files SET resized = 1 WHERE media_id = ?", f.media_id);
  const m = get("media", f.media_id);
  if (m) patch("media", f.media_id, { width: out.width, height: out.height });
  return { ...f, resized: 1 };
}

/** Resize right after capture so storage stays small, without blocking the capture screen. */
export function resizeSoon(mediaId: string) {
  const f = sqlite.getFirstSync<FileRow>("SELECT * FROM files WHERE media_id = ?", mediaId);
  if (f) void ensureResized(f).catch(() => {});
}

let running = false;

/** Upload everything pending, 2 at a time. Idempotent (upsert), safe to call often. */
export async function runUploads(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const queue = sqlite.getAllSync<FileRow>(
      "SELECT * FROM files WHERE state != 'uploaded' AND attempts < 50 ORDER BY CASE kind WHEN 'product_photo' THEN 0 WHEN 'card_photo' THEN 1 ELSE 2 END, rowid");
    const worker = async () => {
      for (let f = queue.shift(); f; f = queue.shift()) await uploadOne(f);
    };
    await Promise.all([worker(), worker()]);
  } finally {
    running = false;
  }
}

async function uploadOne(f0: FileRow): Promise<void> {
  const media = get("media", f0.media_id);
  if (!media?.find_id) return;
  try {
    const f = await ensureResized(f0);
    const file = new File(f.uri);
    if (!file.exists) throw new Error("local file missing");
    const path = `finds/${media.find_id}/${media.id}.${EXT[f.mime] ?? "bin"}`;
    sqlite.runSync("UPDATE files SET state = 'uploading' WHERE media_id = ?", f.media_id);
    const signed = await api<{ signedUrl: string }>({ action: "media_sign", path });
    const res = await file.upload(signed.signedUrl, {
      httpMethod: "PUT",
      headers: { "Content-Type": f.mime, "x-upsert": "true" },
      mimeType: f.mime,
      sessionType: "background",
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`upload HTTP ${res.status}`);
    sqlite.runSync("UPDATE files SET state = 'uploaded', last_error = NULL WHERE media_id = ?", f.media_id);
    patch("media", media.id, { upload_state: "uploaded", storage_path: path, bytes: file.size ?? null });
  } catch (e) {
    sqlite.runSync("UPDATE files SET state = 'error', attempts = attempts + 1, last_error = ? WHERE media_id = ?",
      e instanceof Error ? e.message : String(e), f0.media_id);
  }
}
