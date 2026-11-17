"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUp, Check, LoaderCircle, Sparkles } from "lucide-react";
import { withBase } from "@/lib/base";

export type ChatItem = { role: "user" | "agent"; text: string } | { role: "step"; text: string };

const EXAMPLES = [
  "Change the home page headline to “Tailored in Salt Lake City”",
  "Add a question to the FAQ about how long a suit takes",
  "Make the wedding page intro shorter and warmer",
  "Put an announcement bar up: booking fittings for June weddings now",
];

/**
 * Talk to the website agent. Streams what it's doing ("Reading build.py", "Editing home.html")
 * and its reply; when it finishes, the page refreshes to show the staged changes.
 */
export function AgentChat({ sessionId, initial = [], closed = false }: { sessionId?: string; initial?: ChatItem[]; closed?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<ChatItem[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useRef(sessionId);
  const end = useRef<HTMLDivElement>(null);
  const scroll = () => requestAnimationFrame(() => end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));

  async function send(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    setItems((xs) => [...xs, { role: "user", text: message }, { role: "agent", text: "" }]);
    scroll();
    try {
      const res = await fetch(withBase("/api/agent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id.current, message }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const e = JSON.parse(line) as { type: string; id?: string; delta?: string; label?: string; message?: string; reason?: string };
          if (e.type === "session" && e.id && !id.current) {
            id.current = e.id;
            window.history.replaceState(null, "", withBase(`/website/agent/${e.id}`));
          } else if (e.type === "text" && e.delta) {
            setItems((xs) => {
              const last = xs[xs.length - 1];
              return last?.role === "agent" ? [...xs.slice(0, -1), { role: "agent", text: last.text + e.delta }] : [...xs, { role: "agent", text: e.delta! }];
            });
          } else if (e.type === "tool" && e.label) {
            setItems((xs) => {
              const last = xs[xs.length - 1];
              const trimmed = last?.role === "agent" && !last.text.trim() ? xs.slice(0, -1) : xs;
              return [...trimmed, { role: "step", text: e.label! }, { role: "agent", text: "" }];
            });
          } else if (e.type === "paused" && e.reason) {
            setItems((xs) => [...xs, { role: "agent", text: e.reason! }]);
          } else if (e.type === "error") {
            setError(e.message ?? "Something went wrong.");
          }
          scroll();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setItems((xs) => xs.filter((x) => !(x.role === "agent" && !x.text.trim())));
      setBusy(false);
      if (id.current) router.replace(`/website/agent/${id.current}`, { scroll: false });
      router.refresh();
    }
  }

  return (
    <div className="space-y-4" data-testid="agent-chat">
      {items.length > 0 && (
        <ol className="space-y-3" aria-live="polite">
          {items.map((it, i) =>
            it.role === "step" ? (
              <li key={i} className="flex items-center gap-2 pl-1 text-xs text-stone">
                {busy && i === items.length - 1 ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />}
                {it.text}
              </li>
            ) : (
              <li key={i} className={`flex ${it.role === "user" ? "justify-end" : ""}`}>
                <p className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm whitespace-pre-wrap ${it.role === "user" ? "bg-gold/15 text-ivory" : "glass !rounded-[20px] text-ivory"}`}>
                  {it.role === "agent" && <Sparkles className="mr-1.5 mb-0.5 inline h-3.5 w-3.5 text-gold" aria-hidden="true" />}
                  {it.text}
                </p>
              </li>
            ),
          )}
          {busy && items[items.length - 1]?.role !== "step" && (
            <li className="flex items-center gap-2 pl-1 text-xs text-stone"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Working…</li>
          )}
        </ol>
      )}
      <div ref={end} />
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {!closed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
          className="glass flex items-end gap-2 !rounded-[24px] p-2"
        >
          <label htmlFor="agent-msg" className="sr-only">{items.length ? "Reply to the website agent" : "What would you like to change on the website?"}</label>
          <textarea
            id="agent-msg"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={items.length ? 1 : 3}
            placeholder={items.length ? "Reply, or ask for another tweak…" : "Tell the agent what to change, in your own words…"}
            className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-ivory outline-none placeholder:text-stone"
            disabled={busy}
          />
          <button className="btn !h-11 !w-11 shrink-0 !p-0" disabled={busy || !text.trim()} aria-label="Send">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>
      )}
      {!items.length && !closed && (
        <ul className="flex flex-wrap gap-2" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <button type="button" className="pill !py-1.5 text-left hover:text-ivory" onClick={() => setText(ex)}>{ex}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
