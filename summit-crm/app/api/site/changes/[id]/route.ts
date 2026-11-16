import { refreshChange } from "@/lib/site";

/** Status of a website change while it publishes (signed-in only). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const change = await refreshChange((await params).id);
  return change ? Response.json(change) : Response.json({ error: "Not found" }, { status: 404 });
}
