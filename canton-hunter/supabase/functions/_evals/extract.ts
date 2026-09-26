// Extraction eval: runs the production prompt on evals/extract/cases.json and scores each expectation.
// Run from supabase/functions:  deno run -A _evals/extract.ts   (needs ANTHROPIC_API_KEY)
import { FindExtraction } from "@core";
import { encodeBase64 } from "@std/encoding/base64";
import { extract, image, text, type Content, type Usage } from "../_shared/claude.ts";
import { contextText, EXTRACT_SYSTEM } from "../worker/jobs/processFind.ts";

// deno-lint-ignore no-explicit-any
type Expect = Record<string, any>;
interface Case { id: string; transcript: string; hall?: string; photos?: string; expect: Expect }

const root = new URL("../../../evals/extract/", import.meta.url);
const cases: Case[] = JSON.parse(await Deno.readTextFile(new URL("cases.json", root)));
const only = Deno.args[0];

const near = (a: number | null, b: number | null) => (a == null || b == null ? a === b : Math.abs(a - b) < 0.011);

// deno-lint-ignore no-explicit-any
function checks(x: any, e: Expect): [string, boolean, unknown][] {
  const out: [string, boolean, unknown][] = [];
  const p = x.pricing, a = x.answers, prod = x.product, s = x.supplier;
  const cur = (c: string | null) => (c ?? "").toUpperCase().replace("RMB", "CNY");
  if ("fob_price" in e) out.push(["fob_price", near(p.fob_price, e.fob_price), p.fob_price]);
  if ("currency" in e) out.push(["currency", cur(p.currency) === cur(e.currency), p.currency]);
  if ("moq" in e) out.push(["moq", p.moq === e.moq, p.moq]);
  if ("lead_time_days" in e) out.push(["lead_time_days", e.lead_time_days == null ? p.lead_time_days == null : Math.abs((p.lead_time_days ?? -99) - e.lead_time_days) <= 3, p.lead_time_days]);
  if ("sample_cost" in e) out.push(["sample_cost", near(p.sample_cost, e.sample_cost), p.sample_cost]);
  for (const k of ["oem_logo", "packaging_custom", "is_factory", "sells_to_us_sellers"]) if (k in e) out.push([k, a[k] === e[k], a[k]]);
  if (e.booth_contains) out.push(["booth", (s.booth_code ?? "").replace(/\s/g, "").toUpperCase().includes(e.booth_contains), s.booth_code]);
  if (e.certs_include) out.push(["certifications", e.certs_include.every((c: string) => a.certifications.some((x: string) => x.toUpperCase().includes(c))), a.certifications]);
  if (e.compliance_not) out.push(["compliance risk", prod.compliance.risk !== e.compliance_not, prod.compliance.risk]);
  if (e.compliance_flag_contains) out.push(["compliance flag", prod.compliance.flags.join(" ").toUpperCase().includes(e.compliance_flag_contains), prod.compliance.flags]);
  if (e.name_contains) out.push(["supplier name", `${s.name_en} ${s.name_cn}`.includes(e.name_contains), s.name_en]);
  if (e.supplier_phone_contains) out.push(["phone", s.phones.some((ph: string) => ph.replace(/\D/g, "").includes(e.supplier_phone_contains)), s.phones]);
  return out;
}

let pass = 0, total = 0;
const usage: Usage[] = [];
for (const c of cases.filter((c) => !only || c.id === only)) {
  const content: Content[] = [];
  if (c.photos) {
    for (const [label, file] of [["PRODUCT PHOTO 1:", "product.jpg"], ["BUSINESS CARD 1:", "card.jpg"]]) {
      try {
        const bytes = await Deno.readFile(new URL(`photos/${c.photos}/${file}`, root));
        content.push(text(label), image(encodeBase64(bytes), "image/jpeg"));
      } catch { /* optional */ }
    }
  }
  content.push(text(contextText({ hall: c.hall, transcript: c.transcript, hunt: [] })));
  try {
    const { data, usage: u } = await extract({ system: EXTRACT_SYSTEM, content, schema: FindExtraction, effort: "low" });
    usage.push(u);
    const res = checks(data, c.expect);
    const ok = res.filter(([, v]) => v).length;
    pass += ok; total += res.length;
    console.log(`${ok === res.length ? "✓" : "✗"} ${c.id}  ${ok}/${res.length}`);
    for (const [k, v, got] of res) if (!v) console.log(`    ${k}: got ${JSON.stringify(got)}, expected ${JSON.stringify(c.expect[k] ?? c.expect[`${k}_contains`] ?? "")}`);
  } catch (e) {
    total += Object.keys(c.expect).length;
    console.log(`✗ ${c.id}  ERROR ${(e as Error).message}`);
  }
}
const inTok = usage.reduce((a, u) => a + u.input_tokens, 0), outTok = usage.reduce((a, u) => a + u.output_tokens, 0);
console.log(`\nScore: ${pass}/${total} checks (${total ? Math.round((pass / total) * 100) : 0}%) · ${inTok} input / ${outTok} output tokens · model ${usage[0]?.model ?? "?"}`);
if (total && pass / total < 0.85) Deno.exit(1);
