import type Anthropic from "@anthropic-ai/sdk";
import type { ChatItem } from "@/components/AgentChat";
import { label } from "./run";

/** What Kobe sees of a conversation: his messages, the agent's replies, and one line per action. */
export function transcript(messages: Anthropic.Beta.BetaMessageParam[]): ChatItem[] {
  const out: ChatItem[] = [];
  for (const m of messages) {
    if (!m.content) continue;
    if (m.role === "user") {
      if (typeof m.content === "string") out.push({ role: "user", text: m.content });
      else for (const b of m.content) if (b.type === "text") out.push({ role: "user", text: b.text });
      continue;
    }
    if (typeof m.content === "string") {
      out.push({ role: "agent", text: m.content });
      continue;
    }
    for (const b of m.content) {
      if (b.type === "text" && b.text.trim()) out.push({ role: "agent", text: b.text.trim() });
      if (b.type === "tool_use") out.push({ role: "step", text: label(b.name, (b.input ?? {}) as Record<string, unknown>) });
    }
  }
  return out;
}
