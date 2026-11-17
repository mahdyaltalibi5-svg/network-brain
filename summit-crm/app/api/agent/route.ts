import { headSha } from "@/lib/agent/repo";
import { runAgent, type AgentEvent } from "@/lib/agent/run";
import { createSession, getSession } from "@/lib/agent/store";

export const maxDuration = 300;

/**
 * POST { sessionId?, message } → a newline-delimited JSON stream of AgentEvents. Without a
 * sessionId a new request starts from the website's current commit. Signed-in only (proxy.ts).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string; message?: string };
  const message = String(body.message ?? "").trim().slice(0, 4000);
  if (!message) return Response.json({ error: "Say what you'd like to change." }, { status: 400 });

  let sessionId = body.sessionId;
  try {
    if (sessionId) {
      const s = await getSession(sessionId);
      if (!s) return Response.json({ error: "That request no longer exists." }, { status: 404 });
      if (s.status === "working") return Response.json({ error: "The agent is still working on this request." }, { status: 409 });
    } else {
      sessionId = (await createSession(message.replace(/\s+/g, " ").slice(0, 90), await headSha())).id;
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const enc = new TextEncoder();
  const id = sessionId;
  const stream = new ReadableStream({
    async start(controller) {
      // If the phone drops the connection the agent keeps going and saves its work; the
      // conversation page shows the result on the next visit.
      let open = true;
      const emit = (e: AgentEvent | { type: "session"; id: string }) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          open = false;
        }
      };
      emit({ type: "session", id });
      try {
        await runAgent(id, message, emit);
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : String(e) });
      }
      if (open) controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
