import { getDb } from "@/lib/db";

/** Uptime check: confirms the database answers. Reveals nothing else. */
export async function GET() {
  try {
    await (await getDb()).query("SELECT 1");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
