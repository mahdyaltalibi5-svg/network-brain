import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { envOpt } from "./env.ts";

/** Runtime model for the app's AI work. Change with the CLAUDE_MODEL env var, no deploy needed. */
export const MODEL = envOpt("CLAUDE_MODEL") ?? "claude-opus-5";
export type Effort = "low" | "medium" | "high";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY
  return client;
}

/**
 * Server-side refusal fallbacks ("default" routes by refusal category). On by default; set
 * CLAUDE_FALLBACKS=off to disable (e.g. a model that doesn't support it).
 */
function fallbackParams(): { body: Record<string, unknown>; headers: Record<string, string> } {
  if (envOpt("CLAUDE_FALLBACKS") === "off") return { body: {}, headers: {} };
  return { body: { fallbacks: "default" }, headers: { "anthropic-beta": "server-side-fallback-2026-07-01" } };
}

export interface Usage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  web_searches?: number;
}

function usageOf(msg: Anthropic.Message): Usage {
  const u = msg.usage as Anthropic.Usage & { server_tool_use?: { web_search_requests?: number } };
  return {
    model: msg.model,
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    web_searches: u.server_tool_use?.web_search_requests,
  };
}

function checkStop(msg: Anthropic.Message): void {
  const stop = msg.stop_reason as string | null;
  if (stop === "refusal") throw new Error("Claude declined this request (refusal)");
  if (stop === "max_tokens") throw new Error("Claude output hit max_tokens");
}

export type Content = Anthropic.ContentBlockParam;

export const text = (t: string): Content => ({ type: "text", text: t });
export const image = (data: string, mime: string): Content => ({
  type: "image",
  source: { type: "base64", media_type: mime as "image/jpeg", data },
});

/** One structured-output call. Returns zod-validated data. */
export async function extract<S extends z.ZodType>(opts: {
  system: string;
  content: Content[];
  schema: S;
  effort: Effort;
  maxTokens?: number;
}): Promise<{ data: z.infer<S>; usage: Usage }> {
  const fb = fallbackParams();
  const params = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    system: opts.system,
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort, format: zodOutputFormat(opts.schema) },
    messages: [{ role: "user", content: opts.content }],
    ...fb.body,
  };
  // deno-lint-ignore no-explicit-any
  const msg = await anthropic().messages.parse(params as any, { headers: fb.headers });
  checkStop(msg);
  const parsed = opts.schema.safeParse(msg.parsed_output);
  if (!parsed.success) throw new Error(`Claude output failed validation: ${parsed.error.message.slice(0, 500)}`);
  return { data: parsed.data, usage: usageOf(msg) };
}

/** Make a JSON schema acceptable to strict tool use: every object closed + all keys required, no numeric/string limits. */
export function strictSchema(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (["$schema", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "multipleOf", "pattern", "minItems", "maxItems"].includes(k)) continue;
      o[k] = walk(v);
    }
    if (o.type === "object" && o.properties && typeof o.properties === "object") {
      o.additionalProperties = false;
      o.required = Object.keys(o.properties as object);
    }
    return o;
  };
  return walk(js) as Record<string, unknown>;
}

/**
 * Web research: Claude searches the web, then must call `submit` (strict client tool) with the report.
 * Handles pause_turn continuation and one nudge if Claude ends without submitting.
 */
export async function researchWithSubmit<S extends z.ZodType>(opts: {
  system: string;
  content: Content[];
  schema: S;
  submitDescription: string;
  effort: Effort;
  maxSearches: number;
}): Promise<{ data: z.infer<S>; usage: Usage }> {
  const fb = fallbackParams();
  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: opts.maxSearches },
    {
      name: "submit",
      description: opts.submitDescription,
      strict: true,
      input_schema: strictSchema(opts.schema),
    },
  ];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.content }];
  const total: Usage = { model: MODEL, input_tokens: 0, output_tokens: 0, web_searches: 0 };
  let nudged = false;

  for (let turn = 0; turn < 8; turn++) {
    const params = {
      model: MODEL,
      max_tokens: 16000,
      system: opts.system,
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort },
      tools,
      tool_choice: { type: "auto" },
      messages,
      ...fb.body,
    };
    // deno-lint-ignore no-explicit-any
    const msg = await anthropic().messages.create(params as any, { headers: fb.headers }) as Anthropic.Message;
    const u = usageOf(msg);
    total.model = u.model;
    total.input_tokens += u.input_tokens;
    total.output_tokens += u.output_tokens;
    total.web_searches = (total.web_searches ?? 0) + (u.web_searches ?? 0);
    checkStop(msg);

    const submit = msg.content.find((b) => b.type === "tool_use" && b.name === "submit") as Anthropic.ToolUseBlock | undefined;
    if (submit) {
      const parsed = opts.schema.safeParse(submit.input);
      if (!parsed.success) throw new Error(`submit failed validation: ${parsed.error.message.slice(0, 500)}`);
      return { data: parsed.data, usage: total };
    }
    messages.push({ role: "assistant", content: msg.content as Anthropic.ContentBlockParam[] });
    if ((msg.stop_reason as string) === "pause_turn") continue; // server tool loop paused; resend to continue
    if (nudged) break;
    nudged = true;
    messages.push({ role: "user", content: "Now call the submit tool with your complete report." });
  }
  throw new Error("Claude finished without submitting a report");
}
