import { readFile } from "@/lib/profile";

/** A client's photo or document (signed-in only; see proxy.ts). Images display inline. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const f = await readFile((await params).id);
  if (!f) return new Response("Not found", { status: 404 });
  const inline = /^image\/|^application\/pdf$/.test(f.mime) && !new URL(request.url).searchParams.has("download");
  return new Response(f.data, {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
