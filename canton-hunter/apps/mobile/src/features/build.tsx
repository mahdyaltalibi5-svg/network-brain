/**
 * BUILD: search any product in the journal and follow the steps that turn it into a tested winner:
 * numbers → sample → supplier → landing page → ads → $10/day test → decide → order.
 * Steps tick themselves when the app can see they're done; everything else is a "Mark done" tap.
 */
import { BUILD_STEPS, scoreFind, type BuildStepKey, type LaunchPlan } from "@canton/core";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from "react-native";
import { findTitle, formatMoney, useConfig } from "@/lib/data";
import { all, get, insert, myId, patch, searchFinds, useRow, useTable, type Row } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { syncNow, syncSoon } from "@/lib/sync";
import { Thumb } from "@/ui/findCard";
import { Button, C, Empty, KV, PageHeader, Row as HRow, Screen, SearchBar, T } from "@/ui/kit";
import { requestDraft } from "./followups";

// ---------------------------------------------------------------- index
export function BuildIndexScreen() {
  const finds = useTable("finds");
  const launches = useTable("launches");
  const scores = useTable("scores");
  const [q, setQ] = useState("");

  const building = launches.filter((l) => l.status !== "killed").map((l) => ({ l, f: get("finds", l.find_id) })).filter((x) => x.f) as { l: Row; f: Row }[];
  const buildingIds = new Set(building.map((b) => b.f.id));
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const ids = searchFinds(q);
    return ids.map((id) => get("finds", id)).filter(Boolean).slice(0, 20) as Row[];
  }, [q, finds]);
  const suggested = useMemo(() => {
    const score = new Map(scores.map((s) => [s.find_id, s]));
    return finds.filter((f) => !buildingIds.has(f.id) && (f.gut === "fire" || (score.get(f.id)?.total ?? 0) >= 85) && !score.get(f.id)?.gates_failed?.length)
      .sort((a, b) => (score.get(b.id)?.total ?? 0) - (score.get(a.id)?.total ?? 0)).slice(0, 6);
  }, [finds, scores, launches]);

  return (
    <Screen>
      <PageHeader title="Build" subtitle="Pick a winning product and follow the steps: numbers, sample, supplier, website, ads, test, decide, order." />
      <SearchBar value={q} onChangeText={setQ} placeholder="Search your journal for a product to build…" />
      {q.trim() ? (
        <List title={`${results.length} result${results.length === 1 ? "" : "s"}`}>
          {results.length ? results.map((f) => <ProductRow key={f.id} f={f} />) : <T dim style={{ padding: 16 }}>No matches.</T>}
        </List>
      ) : null}
      {building.length ? (
        <List title="In progress">
          {building.map(({ l, f }) => <ProductRow key={f.id} f={f} progress={progressOf(l, f)} />)}
        </List>
      ) : null}
      {!q.trim() && suggested.length ? (
        <List title="Worth building">
          {suggested.map((f) => <ProductRow key={f.id} f={f} />)}
        </List>
      ) : null}
      {!q.trim() && !building.length && !suggested.length ? <Empty text="Log some products in the Journal first, then search for one here." /> : null}
    </Screen>
  );
}

function List({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <T size={14} bold style={{ color: C.dim, marginBottom: 10 }}>{title}</T>
      <View style={st.list}>{children}</View>
    </View>
  );
}

function ProductRow({ f, progress }: { f: Row; progress?: number }) {
  const s = get("suppliers", f.supplier_id);
  return (
    <Pressable onPress={() => router.push(`/build/${f.id}`)} style={({ pressed }) => [st.row, pressed && { backgroundColor: "#FAFAF9" }]}>
      <Thumb findId={f.id} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <T size={16} bold numberOfLines={1}>{findTitle(f)}</T>
        <T size={14} dim numberOfLines={1}>{[s?.name_en ?? s?.name_cn, f.fob_price_cents != null ? `${formatMoney(f.fob_price_cents, f.fob_currency ?? "USD")} · MOQ ${f.moq ?? "?"}` : null].filter(Boolean).join(" · ")}</T>
      </View>
      {progress != null ? <T size={14} dim>{progress} of {BUILD_STEPS.length}</T> : <T size={18} dim>›</T>}
    </Pressable>
  );
}

// ---------------------------------------------------------------- step state
type Ctx = { f: Row; l: Row | undefined; research?: Row; samples: Row[]; vetting?: Row; metrics: Row[]; checklist: { key: string; label: string }[] };

function autoDone(key: BuildStepKey, c: Ctx, marginOk: boolean): boolean {
  switch (key) {
    case "numbers": return !!c.research && marginOk;
    case "sample": return c.samples.some((s) => s.status === "in_hand" || s.status === "arrived");
    case "supplier": return c.checklist.length > 0 && c.checklist.every((i) => c.vetting?.checklist?.[i.key]?.done);
    case "website": return !!c.l?.landing_url;
    case "launch": return !!c.l?.activated_at;
    case "order": return ["ordered", "qc", "shipped", "landed"].includes(c.f.stage);
    default: return false;
  }
}

function progressOf(l: Row, f: Row): number {
  const cfg = { vetting: all("vetting").find((v) => v.find_id === f.id) };
  const research = all("research").find((r) => r.find_id === f.id);
  const samples = all("samples").filter((s) => s.find_id === f.id);
  const sc = all("scores").find((s) => s.find_id === f.id);
  const c: Ctx = { f, l, research, samples, vetting: cfg.vetting, metrics: [], checklist: [] };
  return BUILD_STEPS.filter((s) => l.build_steps?.[s.key]?.done || autoDone(s.key, c, (sc?.margin_multiple ?? 0) >= 3)).length;
}

// ---------------------------------------------------------------- guide
export function BuildGuideScreen({ id }: { id: string }) {
  const f = useRow("finds", id);
  const launches = useTable("launches");
  useTable("research"); useTable("samples"); useTable("vetting"); useTable("launch_metrics"); useTable("cost_calcs"); useTable("votes"); useTable("followups");
  const cfg = useConfig();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const l = launches.find((x) => x.find_id === id);
  if (!f) return <Screen><PageHeader title="Not found" back="Build" /></Screen>;

  const research = all("research").find((r) => r.find_id === id);
  const samples = all("samples").filter((s) => s.find_id === id);
  const vetting = all("vetting").find((v) => v.find_id === id);
  const metrics = all("launch_metrics").filter((m) => m.launch_id === l?.id).sort((a, b) => b.date.localeCompare(a.date));
  const calc = all("cost_calcs").find((c) => c.find_id === id);
  const live = scoreFind(f as never, research as never, all("votes").filter((v) => v.find_id === id).map((v) => v.value), cfg, (calc?.inputs ?? {}) as never);
  const marginOk = (live.cost?.margin_multiple ?? 0) >= 3;
  const ctx: Ctx = { f, l, research, samples, vetting, metrics, checklist: cfg.vetting_checklist };
  const isDone = (k: BuildStepKey) => !!l?.build_steps?.[k]?.done || autoDone(k, ctx, marginOk);
  const doneCount = BUILD_STEPS.filter((s) => isDone(s.key)).length;
  const current = BUILD_STEPS.find((s) => !isDone(s.key))?.key ?? null;
  const expanded = open ?? current;
  const plan = l?.plan as LaunchPlan | null | undefined;

  function ensureLaunch(): Row {
    return l ?? insert("launches", { find_id: id, status: "draft", build_steps: {} });
  }
  function toggle(k: BuildStepKey) {
    const row = ensureLaunch();
    const cur = row.build_steps ?? {};
    patch("launches", row.id, { build_steps: { ...cur, [k]: { done: !cur[k]?.done, by: myId(), at: new Date().toISOString() } } });
    syncSoon();
  }
  async function launchAction(act: string) {
    const row = ensureLaunch();
    setBusy(act);
    await syncNow();
    const { error } = await supabase.rpc("launch_action", { p_launch_id: row.id, p_action: act });
    setBusy(null);
    if (error) Alert.alert("Couldn't do that", error.message);
    else syncSoon(2000);
  }
  async function job(type: string) {
    setBusy(type);
    const { error } = await supabase.rpc("request_job", { p_type: type, p_payload: { find_id: id } });
    setBusy(null);
    Alert.alert(error ? "Needs internet" : "Started", error?.message ?? "Results appear here in a minute or two.");
  }
  function sampleReceived() {
    const s = samples[0];
    if (s) patch("samples", s.id, { status: "in_hand" });
    else insert("samples", { find_id: id, supplier_id: f!.supplier_id, status: "in_hand", carried_by: myId() });
    if (["found", "shortlisted", "quote_requested", "quote_received", "sample_requested"].includes(f!.stage)) patch("finds", id, { stage: "sample_in_hand" });
  }
  function setVet(key: string, done: boolean) {
    const checklist = { ...(vetting?.checklist ?? {}), [key]: { done, by: myId(), at: new Date().toISOString() } };
    if (vetting) patch("vetting", vetting.id, { checklist });
    else insert("vetting", { id, find_id: id, checklist, override_reason: null, completed_at: null });
  }
  function followUp(purpose: string) {
    if (!f!.supplier_id) { Alert.alert("No supplier yet", "Add a business card photo to this entry first."); return; }
    void requestDraft(f!.supplier_id, purpose);
    router.push("/followups");
  }
  function goLive() {
    Alert.alert("Turn on ads?", `This starts spending real money: about $10/day on Meta. You can pause any time.`,
      [{ text: "Cancel", style: "cancel" }, { text: "Go live", style: "destructive", onPress: () => void launchAction("activate") }]);
  }

  const totals = metrics.reduce((a, m) => ({ spend: a.spend + m.spend_cents, clicks: a.clicks + m.clicks, impr: a.impr + m.impressions }), { spend: 0, clicks: 0, impr: 0 });
  const latest = metrics[0];

  const body: Record<BuildStepKey, ReactNode> = {
    numbers: (
      <>
        {live.cost ? (
          <>
            <KV k="Landed cost / unit" v={`$${live.cost.landed_unit_usd.toFixed(2)}`} />
            <KV k="Retail price" v={`$${live.costInput!.retail_price_usd.toFixed(2)}`} />
            <KV k="Profit per sale (before ads)" v={`$${live.cost.gross_margin_usd.toFixed(2)}`} />
            <KV k="Margin" v={<T bold style={{ color: marginOk ? C.good : C.bad }}>{live.cost.margin_multiple.toFixed(1)}× {marginOk ? "· good" : "· under 3×"}</T>} />
            <KV k="Can arrive by" v={live.cost.arrive_by} />
          </>
        ) : <T dim>Add a price to this entry to see the real margin.</T>}
        {research ? <T size={14} style={{ marginTop: 10 }}>{research.summary}</T> : <T dim size={14} style={{ marginTop: 10 }}>No market research yet.</T>}
        <HRow style={{ marginTop: 12 }}>
          <Button title={research ? "Research again" : "Research the market"} kind="secondary" busy={busy === "research_find"} onPress={() => job("research_find")} />
          <Button title="Edit numbers" kind="ghost" onPress={() => router.push(`/find/${id}`)} />
        </HRow>
      </>
    ),
    sample: (
      <>
        <T size={14} dim>{samples.length ? `Sample: ${samples[0]!.status.replace("_", " ")}${samples[0]!.bag_label ? ` · ${samples[0]!.bag_label}` : ""}` : "No sample requested yet."}</T>
        <HRow style={{ marginTop: 12 }}>
          <Button title="Ask supplier for a sample" kind="secondary" onPress={() => followUp("sample")} />
          <Button title="Sample received" kind="ghost" onPress={sampleReceived} />
        </HRow>
      </>
    ),
    supplier: (
      <>
        {cfg.vetting_checklist.map((i) => (
          <View key={i.key} style={st.check}>
            <T size={14} style={{ flex: 1 }}>{i.label}</T>
            <Switch value={!!vetting?.checklist?.[i.key]?.done} onValueChange={(v) => setVet(i.key, v)} />
          </View>
        ))}
      </>
    ),
    website: (
      <>
        {!plan ? (
          <>
            <T size={14} dim>The AI writes the page copy, price, offer (waitlist or preorder) and ad scripts from what you logged.</T>
            <Button title={l?.status === "planning" ? "Writing…" : "Write the page and ad plan"} busy={busy === "plan" || l?.status === "planning"} onPress={() => launchAction("plan")} style={{ marginTop: 12, alignSelf: "flex-start" }} />
          </>
        ) : (
          <>
            <KV k="Headline" v={plan.copy.title} />
            <KV k="Price" v={`$${((l?.price_cents ?? plan.offer.price_usd * 100) / 100).toFixed(2)}`} />
            <KV k="Offer" v={`${l?.mode ?? plan.offer.mode}${l?.ship_by_date ? ` · ships by ${l.ship_by_date}` : ""}`} />
            <T size={14} style={{ marginTop: 10 }}>{plan.copy.description}</T>
            {plan.copy.bullets.map((b, i) => <T key={i} size={14} dim>• {b}</T>)}
            <HRow style={{ marginTop: 12 }}>
              {l?.status === "plan_ready" ? <Button title="Approve" busy={busy === "approve"} onPress={() => launchAction("approve")} /> : null}
              {l?.status === "approved" || (l?.status === "error" && !l?.landing_url) ? <Button title="Build the page (ads stay paused)" busy={busy === "build"} onPress={() => launchAction("build")} /> : null}
              {l?.status === "building" ? <T dim>Building on Shopify…</T> : null}
              {l?.landing_url ? <Button title="Open the page" kind="secondary" onPress={() => Linking.openURL(l.landing_url)} /> : null}
              <Button title="Rewrite" kind="ghost" onPress={() => launchAction("plan")} />
            </HRow>
          </>
        )}
      </>
    ),
    ads: plan ? (
      <>
        {plan.ad_scripts.map((a, i) => (
          <View key={i} style={{ paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line }}>
            <T bold>“{a.hook}”</T>
            <T size={14} style={{ marginTop: 4 }}>{a.body}</T>
            <T size={13} dim style={{ marginTop: 4 }}>Shots: {a.shot_list.join(" · ")}</T>
            <Pressable onPress={() => { void Clipboard.setStringAsync(`${a.hook}\n\n${a.body}\n\n${a.cta}\n\nShots:\n${a.shot_list.join("\n")}`); }}><T size={13} style={{ marginTop: 6, textDecorationLine: "underline" }}>Copy script</T></Pressable>
          </View>
        ))}
        <T size={13} dim style={{ marginTop: 10 }}>Headline: {plan.meta.headlines[0]} · Text: {plan.meta.primary_texts[0]}</T>
      </>
    ) : <T dim size={14}>Write the page and ad plan first (step 4).</T>,
    launch: (
      <>
        <T size={14} dim>{l?.meta_status === "active" ? `Live since ${new Date(l.activated_at).toLocaleDateString()}.` : l?.meta_campaign_id ? "Campaign is built and paused." : "Build the page first; the campaign is created paused."}</T>
        <HRow style={{ marginTop: 12 }}>
          {l?.meta_campaign_id && l.meta_status !== "active" && l.status !== "killed" ? <Button title="Go live · $10/day" kind="danger" busy={busy === "activate"} onPress={goLive} /> : null}
          {l?.meta_status === "active" ? <Button title="Pause ads" kind="secondary" busy={busy === "pause"} onPress={() => launchAction("pause")} /> : null}
        </HRow>
      </>
    ),
    decide: (
      <>
        {metrics.length ? (
          <>
            <KV k="Spent" v={`$${(totals.spend / 100).toFixed(2)}`} />
            <KV k="Click rate" v={totals.impr ? `${((totals.clicks / totals.impr) * 100).toFixed(2)}%` : "—"} />
            <KV k={l?.mode === "preorder" ? "Preorders" : "Waitlist signups"} v={String(l?.mode === "preorder" ? latest?.preorders ?? 0 : latest?.waitlist_signups ?? 0)} />
            {latest?.recommendation ? <T bold style={{ marginTop: 10, color: latest.recommendation === "kill" ? C.bad : latest.recommendation === "scale" ? C.good : C.text }}>
              Recommendation: {latest.recommendation === "keep" ? "keep testing" : latest.recommendation}{latest.reasons?.length ? ` — ${latest.reasons.join("; ")}` : ""}</T> : null}
          </>
        ) : <T dim size={14}>Results show up here daily once the ads are live.</T>}
        {l?.meta_status === "active" ? (
          <HRow style={{ marginTop: 12 }}>
            <Button title="Kill the test" kind="secondary" onPress={() => Alert.alert("Kill this test?", "Pauses ads and marks the product killed.", [{ text: "Cancel", style: "cancel" }, { text: "Kill", style: "destructive", onPress: () => void launchAction("kill") }])} />
          </HRow>
        ) : null}
      </>
    ),
    order: (
      <>
        <T size={14} dim>{isDone("supplier") ? "Supplier is vetted. Confirm specs, packaging, lead time and pay through Trade Assurance." : "Finish vetting the supplier (step 3) before ordering."}</T>
        <HRow style={{ marginTop: 12 }}>
          <Button title="Draft the order message" kind="secondary" onPress={() => followUp("order")} />
          {isDone("supplier") ? <Button title="Mark as ordered" kind="ghost" onPress={() => patch("finds", id, { stage: "ordered" })} /> : null}
        </HRow>
      </>
    ),
  };

  return (
    <Screen narrow>
      <PageHeader title={findTitle(f)} back="Build" subtitle={`${doneCount} of ${BUILD_STEPS.length} steps done`} />
      <View style={st.progressTrack}><View style={[st.progressFill, { width: `${(doneCount / BUILD_STEPS.length) * 100}%` }]} /></View>
      <HRow style={{ marginBottom: 20 }}>
        <Button title="Open journal entry" kind="ghost" onPress={() => router.push(`/find/${id}`)} />
      </HRow>

      {BUILD_STEPS.map((step, i) => {
        const done = isDone(step.key);
        const isOpen = expanded === step.key;
        const manual = !autoDone(step.key, ctx, marginOk);
        return (
          <View key={step.key} style={[st.step, isOpen && { borderColor: "#CFCBC6" }]}>
            <Pressable onPress={() => setOpen(isOpen ? "__none" : step.key)} style={st.stepHead}>
              <View style={[st.num, done && { backgroundColor: C.text, borderColor: C.text }]}>
                <T size={13} bold style={{ color: done ? C.onAccent : C.dim }}>{done ? "✓" : i + 1}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T size={16} bold style={done ? { color: C.dim } : undefined}>{step.title}</T>
                {isOpen ? <T size={13} dim style={{ marginTop: 2 }}>{step.why}</T> : null}
              </View>
              <T size={18} dim>{isOpen ? "–" : "+"}</T>
            </Pressable>
            {isOpen ? (
              <View style={{ paddingTop: 4 }}>
                {body[step.key]}
                {manual ? (
                  <Pressable onPress={() => toggle(step.key)} style={{ marginTop: 14, alignSelf: "flex-start" }}>
                    <T size={14} style={{ textDecorationLine: "underline" }}>{l?.build_steps?.[step.key]?.done ? "Mark as not done" : "Mark this step done"}</T>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

const st = StyleSheet.create({
  list: { backgroundColor: C.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  step: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  num: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#CFCBC6", alignItems: "center", justifyContent: "center" },
  check: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  progressTrack: { height: 6, backgroundColor: C.card2, borderRadius: 3, marginBottom: 8, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: C.text, borderRadius: 3 },
});
