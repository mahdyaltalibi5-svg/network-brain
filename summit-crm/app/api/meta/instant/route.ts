import { createTestLead, instantStatus } from "@/lib/meta/instant";

/** Signed-in only (proxy.ts). GET: instant-delivery status. POST: create a Meta test lead. */
export const maxDuration = 60;
const err = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });

export async function GET() {
  try {
    return Response.json(await instantStatus());
  } catch (e) {
    return err(e);
  }
}

export async function POST() {
  try {
    return Response.json(await createTestLead());
  } catch (e) {
    return err(e);
  }
}
