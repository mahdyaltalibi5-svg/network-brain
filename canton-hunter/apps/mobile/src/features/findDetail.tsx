import { eff, scoreFind, STAGES, type CostOverrides, type FreightMode } from "@canton/core";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, ScrollView, Switch, View } from "react-native";
import { findCategory, findDescription, findTitle, formatMoney, GUT_EMOJI, mediaFor, useConfig, useMediaSource, usePeople } from "@/lib/data";
import { all, insert, myId, patch, softDelete, useRow, useTable, type Row } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { syncSoon } from "@/lib/sync";
import { Badge, Button, C, Card, Chip, Field, KV, Row as HRow, Screen, Section, T } from "@/ui/kit";

const copy = (v: string) => { void Clipboard.setStringAsync(v); Alert.alert("Copied", v); };

function Photo({ m }: { m: Row }) {
  const src = useMediaSource(m);
  return src ? <Image source={src} style={{ width: 280, height: 280, borderRadius: 16, backgroundColor: C.card2 }} contentFit="cover" cachePolicy="disk" />
    : <View style={{ width: 280, height: 280, borderRadius: 16, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}><T dim>{m.upload_state === "uploaded" ? "Loading…" : "On teammate's phone"}</T></View>;
}

/** Text/number field that saves when you finish editing. */
function EditField({ label, value, onSave, numeric, multiline, placeholder }: {
  label: string; value: string | number | null | undefined; onSave: (v: string) => void; numeric?: boolean; multiline?: boolean; placeholder?: string;
}) {
  const [v, setV] = useState(value == null ? "" : String(value));
  return <Field label={label} value={v} onChangeText={setV} onEndEditing={() => { if (v !== (value == null ? "" : String(value))) onSave(v); }}
    keyboardType={numeric ? "decimal-pad" : "default"} multiline={multiline} placeholder={placeholder} />;
}

const num = (s: string) => { const n = Number(s.replace(/[^\d.]/g, "")); return s.trim() === "" || !Number.isFinite(n) ? null : n; };

function TriToggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <HRow style={{ justifyContent: "space-between", paddingVertical: 6 }}>
      <T style={{ flex: 1 }}>{label}</T>
      <Chip label="Yes" active={value === true} color={C.good} onPress={() => onChange(value === true ? null : true)} />
      <Chip label="No" active={value === false} color={C.bad} onPress={() => onChange(value === false ? null : false)} />
    </HRow>
  );
}

export function FindDetail({ id }: { id: string }) {
  const f = useRow("finds", id);
  useTable("media"); useTable("votes"); useTable("research"); useTable("scores"); useTable("cost_calcs"); useTable("vetting"); useTable("samples"); useTable("launches");
  const supplier = useRow("suppliers", f?.supplier_id);
  const cfg = useConfig();
  const people = usePeople();
  const me = myId();

  const research = all("research").find((r) => r.find_id === id);
  const score = all("scores").find((s) => s.find_id === id);
  const calc = all("cost_calcs").find((c) => c.find_id === id);
  const votes = all("votes").filter((v) => v.find_id === id);
  const myVote = votes.find((v) => v.user_id === me);
  const vetting = all("vetting").find((v) => v.find_id === id);
  const samples = all("samples").filter((s) => s.find_id === id);
  const launch = all("launches").find((l) => l.find_id === id);
  const photos = [...mediaFor(id, "product_photo"), ...mediaFor(id, "card_photo")];
  const hasVideo = mediaFor(id, "video").length > 0;

  const [scenario, setScenario] = useState<CostOverrides>(() => (calc?.inputs ?? {}) as CostOverrides);
  const live = useMemo(() => f ? scoreFind(f as never, research as never, votes.map((v) => v.value), cfg, scenario) : null, [f, research, votes.length, cfg, scenario]);

  if (!f) return <Screen><T dim>Not found.</T></Screen>;
  const set = (p: Partial<Row>) => patch("finds", f.id, p);

  function vote(value: number) {
    if (myVote) patch("votes", myVote.id, { value });
    else insert("votes", { find_id: f!.id, user_id: me, value, comment: null });
    syncSoon();
  }

  function setStage(stage: string) {
    if (stage === "ordered") {
      const items = cfg.vetting_checklist;
      const done = items.every((i) => vetting?.checklist?.[i.key]?.done);
      if (!done && !vetting?.override_reason) {
        Alert.alert("Vetting not complete", "Finish the vetting checklist (below) or give an override reason before ordering.");
        return;
      }
    }
    if (stage === "killed") {
      Alert.prompt("Why kill it?", undefined, (reason) => {
        insert("pipeline_events", { find_id: f!.id, from_stage: f!.stage, to_stage: "killed", by_user: me, note: reason ?? null });
        set({ stage: "killed", killed_reason: reason ?? null });
      });
      return;
    }
    insert("pipeline_events", { find_id: f!.id, from_stage: f!.stage, to_stage: stage, by_user: me, note: null });
    set({ stage });
  }

  function setVet(key: string, done: boolean) {
    const checklist = { ...(vetting?.checklist ?? {}), [key]: { done, by: me, at: new Date().toISOString() } };
    if (vetting) patch("vetting", vetting.id, { checklist });
    else insert("vetting", { find_id: f!.id, checklist, override_reason: null, completed_at: null });
  }

  function saveScenario() {
    if (calc) patch("cost_calcs", calc.id, { inputs: scenario });
    else insert("cost_calcs", { find_id: f!.id, inputs: scenario });
    syncSoon();
    Alert.alert("Saved", "The team will see this scenario and the score will update.");
  }

  async function requestJob(type: string) {
    const { error } = await supabase.rpc("request_job", { p_type: type, p_payload: { find_id: f!.id } });
    if (error) Alert.alert("Needs internet", error.message);
    else Alert.alert("Queued", type === "research_find" ? "Research takes a minute or two." : "Reprocessing.");
  }

  function startLaunch() {
    if (launch) { router.push(`/launch/${launch.id}`); return; }
    const l = insert("launches", { find_id: f!.id, status: "draft" });
    if (f!.stage === "found" || f!.stage === "shortlisted") setStage("testing");
    syncSoon(0);
    router.push(`/launch/${l.id}`);
  }

  function ping() {
    insert("pings", { find_id: f!.id, from_user: me, hall: f!.hall, booth_code: f!.booth_code, message: "Come look at this", sent_at: new Date().toISOString() });
    syncSoon(0);
    Alert.alert("Pinged the team 👀");
  }

  const compliance = eff(f.compliance_override, f.compliance_ai) as { risk: string; flags: string[] } | null;
  const lowConf = ((f.ai_confidence ?? []) as { field: string; value: number }[]).filter((c) => c.value < 0.6).map((c) => c.field);
  const cost = live?.cost;
  const cur = f.fob_currency ?? "USD";

  return (
    <Screen>
      <Stack.Screen options={{ title: findTitle(f).slice(0, 28) }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {photos.map((m) => <Photo key={m.id} m={m} />)}
      </ScrollView>
      <HRow style={{ marginTop: 10 }}>
        {f.gut ? <Badge label={GUT_EMOJI[f.gut]!} /> : null}
        {hasVideo ? <Badge label="🎥 video" /> : null}
        {score ? <Badge label={`★ ${Math.round(score.total)}`} color={score.gates_failed?.length ? C.bad : C.accent} /> : null}
        {f.hunt_item_id ? <Badge label="🎯 on hunt list" color={C.blue} /> : null}
        <T dim size={13}>{people.get(f.captured_by)?.name} · {new Date(f.captured_at).toLocaleString()}</T>
      </HRow>

      <View style={{ marginTop: 12 }}>
        <EditField key={`t-${f.title_ai}`} label="Title" value={findTitle(f)} onSave={(v) => set({ title_override: v || null })} />
      </View>

      <Section title="Team vote">
        <HRow>
          {[{ v: -1, l: "✕ Pass" }, { v: 1, l: "👍 Like" }, { v: 2, l: "🔥 Must test" }].map((o) => (
            <Chip key={o.v} label={o.l} active={myVote?.value === o.v} onPress={() => vote(o.v)} color={o.v === -1 ? C.bad : o.v === 2 ? C.accent : C.good} />
          ))}
        </HRow>
        <HRow style={{ marginTop: 8 }}>
          {votes.map((v) => <Badge key={v.id} label={`${people.get(v.user_id)?.name ?? "?"}: ${v.value === 2 ? "🔥" : v.value === 1 ? "👍" : v.value === -1 ? "✕" : "·"}`} />)}
        </HRow>
      </Section>

      <Section title="Actions">
        <HRow>
          <Button title="👀 Come look" kind="secondary" onPress={ping} />
          <Button title="🔎 Research now" kind="secondary" onPress={() => requestJob("research_find")} />
          {f.processing_state === "error" ? <Button title="↻ Retry AI" kind="secondary" onPress={() => requestJob("process_find")} /> : null}
          <Button title={launch ? "🚀 Open launch" : "🚀 Launch this"} onPress={startLaunch} />
        </HRow>
      </Section>

      <Section title="Stage">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {STAGES.map((s) => <Chip key={s} label={s.replace(/_/g, " ")} active={f.stage === s} onPress={() => setStage(s)} color={s === "killed" ? C.bad : C.blue} />)}
        </ScrollView>
        {f.killed_reason ? <T dim style={{ marginTop: 6 }}>Killed: {f.killed_reason}</T> : null}
      </Section>

      {lowConf.length ? <Card style={{ borderColor: C.warn, marginTop: 16 }}><T size={14}>⚠️ Double-check: {lowConf.join(", ")}</T></Card> : null}

      <Section title="Deal terms">
        <HRow gap={8}>
          <View style={{ flex: 2 }}><EditField key={`p-${f.fob_price_cents}`} label={`FOB price (${cur})`} value={f.fob_price_cents != null ? (f.fob_price_cents / 100).toFixed(2) : null} numeric onSave={(v) => set({ fob_price_cents: num(v) == null ? null : Math.round(num(v)! * 100) })} /></View>
          <View style={{ flex: 1 }}>
            <T size={13} dim style={{ marginBottom: 4 }}>Currency</T>
            <HRow gap={4}>{["USD", "CNY"].map((c) => <Chip key={c} label={c} active={cur === c} onPress={() => set({ fob_currency: c })} />)}</HRow>
          </View>
        </HRow>
        <HRow gap={8}>
          <View style={{ flex: 1 }}><EditField key={`m-${f.moq}`} label="MOQ" value={f.moq} numeric onSave={(v) => set({ moq: num(v) })} /></View>
          <View style={{ flex: 1 }}><EditField key={`l-${f.lead_time_days}`} label="Lead time (days)" value={f.lead_time_days} numeric onSave={(v) => set({ lead_time_days: num(v) })} /></View>
          <View style={{ flex: 1 }}><EditField key={`s-${f.sample_cost_cents}`} label="Sample $" value={f.sample_cost_cents != null ? f.sample_cost_cents / 100 : null} numeric onSave={(v) => set({ sample_cost_cents: num(v) == null ? null : Math.round(num(v)! * 100) })} /></View>
        </HRow>
        <HRow gap={8}>
          <View style={{ flex: 1 }}><EditField key={`w-${f.unit_weight_g}`} label="Weight (g)" value={f.unit_weight_g} numeric onSave={(v) => set({ unit_weight_g: num(v) })} /></View>
          <View style={{ flex: 2 }}><EditField key={`d-${f.box_dims_mm}`} label="Box L×W×H (mm)" value={f.box_dims_mm?.join("x")} onSave={(v) => { const d = v.split(/[x×*, ]+/).map(Number).filter((n) => n > 0); set({ box_dims_mm: d.length === 3 ? d : null }); }} /></View>
        </HRow>
        <TriToggle label="Custom logo possible" value={f.oem_logo} onChange={(v) => set({ oem_logo: v })} />
        <TriToggle label="Custom packaging" value={f.packaging_custom} onChange={(v) => set({ packaging_custom: v })} />
        <TriToggle label="Already sells to US Amazon/TikTok sellers" value={f.sells_to_us_sellers} onChange={(v) => set({ sells_to_us_sellers: v })} />
        <TriToggle label="Fragile" value={f.fragile} onChange={(v) => set({ fragile: v })} />
      </Section>

      <Section title="Landed cost (live)">
        <HRow>{(["air", "express", "sea"] as FreightMode[]).map((m) => <Chip key={m} label={m} active={(scenario.mode ?? "air") === m} onPress={() => setScenario({ ...scenario, mode: m })} />)}</HRow>
        <HRow gap={8} style={{ marginTop: 8 }}>
          <View style={{ flex: 1 }}><Field label="Qty" keyboardType="number-pad" value={String(scenario.qty ?? live?.costInput?.qty ?? "")} onChangeText={(v) => setScenario({ ...scenario, qty: num(v) ?? undefined })} /></View>
          <View style={{ flex: 1 }}><Field label="Retail $" keyboardType="decimal-pad" value={String(scenario.retail_price_usd ?? live?.costInput?.retail_price_usd?.toFixed(2) ?? "")} onChangeText={(v) => setScenario({ ...scenario, retail_price_usd: num(v) ?? undefined })} /></View>
          <View style={{ flex: 1 }}><Field label="Duty % override" keyboardType="decimal-pad" value={scenario.duty_rate_override != null ? String(scenario.duty_rate_override * 100) : ""} onChangeText={(v) => setScenario({ ...scenario, duty_rate_override: num(v) == null ? null : num(v)! / 100 })} /></View>
        </HRow>
        {cost ? (
          <Card>
            {cost.lines.map((l) => <KV key={l.label} k={l.label} v={`$${l.per_unit_usd.toFixed(2)}`} />)}
            <KV k="Landed / unit" v={<T bold>${cost.landed_unit_usd.toFixed(2)}</T>} />
            <KV k="Per-order costs" v={`$${cost.per_order_costs_usd.toFixed(2)}`} />
            <KV k="Gross margin" v={<T bold style={{ color: cost.gross_margin_usd > 0 ? C.good : C.bad }}>${cost.gross_margin_usd.toFixed(2)}</T>} />
            <KV k="Margin multiple" v={<T bold style={{ color: cost.margin_multiple >= 3 ? C.good : C.bad }}>{cost.margin_multiple.toFixed(1)}×</T>} />
            <KV k="After ads (est. CPA)" v={`$${cost.margin_after_ads_usd.toFixed(2)}`} />
            <KV k="Break-even ROAS" v={cost.breakeven_roas ? `${cost.breakeven_roas.toFixed(2)}` : "—"} />
            <KV k="Arrives by" v={`${cost.arrive_by_earliest} – ${cost.arrive_by}`} />
            {cost.warnings.map((w) => <T key={w} size={12} style={{ color: C.warn, marginTop: 4 }}>⚠️ {w}</T>)}
            <Button title="Save scenario for the team" kind="secondary" onPress={saveScenario} style={{ marginTop: 10 }} />
          </Card>
        ) : <T dim>Add a FOB price to see the real margin.</T>}
      </Section>

      {live ? (
        <Section title={`Score ${Math.round(live.score.total)} (base ${Math.round(live.score.base)} + heat ${live.score.heat_bonus})`}>
          {live.score.gates_failed.map((g) => <T key={g} style={{ color: C.bad }}>⛔ {g}</T>)}
          <Card>{live.score.breakdown.map((b) => <KV key={b.key} k={`${b.label} ×${b.weight}`} v={`${b.score}${b.unknown ? " (unknown)" : ""}`} />)}</Card>
        </Section>
      ) : null}

      <Section title="Research">
        {research?.report ? (
          <Card>
            <T style={{ marginBottom: 8 }}>{research.summary}</T>
            <KV k="US retail" v={`${formatMoney(research.retail_low_cents)} – ${formatMoney(research.retail_high_cents)}`} />
            <KV k="Competition" v={research.competition} />
            <KV k="IP risk" v={<T bold style={{ color: research.ip_risk === "high" ? C.bad : research.ip_risk === "med" ? C.warn : C.good }}>{research.ip_risk}</T>} />
            <T dim size={13} style={{ marginTop: 6 }}>{research.report.trend_notes}</T>
            {research.report.cheaper_source_found ? <T size={13} style={{ color: C.warn, marginTop: 6 }}>💸 {research.report.cheaper_source_notes}</T> : null}
            {(research.sources ?? []).slice(0, 8).map((s: Row, i: number) => (
              <T key={i} size={13} style={{ color: C.blue, marginTop: 6 }} numberOfLines={1}>
                <T size={13} style={{ color: C.blue }} >{`${s.platform}: ${s.price_usd != null ? `$${s.price_usd} · ` : ""}${s.title}`}</T>
              </T>
            ))}
            <HRow style={{ marginTop: 8 }}>{(research.sources ?? []).slice(0, 4).map((s: Row, i: number) => <Button key={i} title={`Open ${i + 1}`} kind="ghost" onPress={() => Linking.openURL(s.url)} />)}</HRow>
          </Card>
        ) : <T dim>Runs overnight for 🔥/👍 finds, or tap Research now.</T>}
      </Section>

      <Section title="Supplier">
        {supplier ? (
          <Card>
            <T bold size={17}>{supplier.name_en ?? supplier.name_cn ?? "Unknown"}</T>
            {supplier.name_cn && supplier.name_en ? <T dim>{supplier.name_cn}</T> : null}
            {supplier.contact_name ? <KV k="Contact" v={`${supplier.contact_name}${supplier.title ? ` · ${supplier.title}` : ""}`} /> : null}
            {(supplier.phones ?? []).map((p: string) => <KV key={p} k="Phone" v={p} onPress={() => copy(p)} />)}
            {(supplier.emails ?? []).map((e: string) => <KV key={e} k="Email" v={e} onPress={() => copy(e)} />)}
            {supplier.wechat_id ? <KV k="WeChat" v={supplier.wechat_id} onPress={() => copy(supplier.wechat_id)} /> : null}
            {supplier.wechat_qr_payload ? <KV k="WeChat QR" v="Copy link" onPress={() => copy(supplier.wechat_qr_payload)} /> : null}
            <KV k="Booth" v={[supplier.hall && `Hall ${supplier.hall}`, supplier.booth_code].filter(Boolean).join(" · ") || "—"} />
            <KV k="Factory?" v={eff(supplier.is_factory_override, supplier.is_factory_ai) == null ? "unknown" : eff(supplier.is_factory_override, supplier.is_factory_ai) ? "factory" : "trading co."} />
            {supplier.website ? <KV k="Website" v={supplier.website} onPress={() => Linking.openURL(supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`)} /> : null}
          </Card>
        ) : <T dim>{f.processing_state === "done" ? "No business card on this find." : "Reading the business card…"}</T>}
      </Section>

      <Section title="Product">
        <EditField key={`desc-${f.description_ai}`} label="Description" value={findDescription(f)} multiline onSave={(v) => set({ description_override: v || null })} />
        <EditField key={`cat-${f.category_ai}`} label="Category" value={findCategory(f)} onSave={(v) => set({ category_override: v || null })} />
        {compliance ? <KV k="Compliance" v={<T bold style={{ color: compliance.risk === "none" ? C.good : compliance.risk === "easy" ? C.warn : C.bad }}>{compliance.risk}{compliance.flags.length ? ` · ${compliance.flags.join(", ")}` : ""}</T>} /> : null}
        {f.hts_guess_ai ? <KV k="HTS guess" v={f.hts_guess_ai} /> : null}
        {(f.tags_ai ?? []).length ? <KV k="Tags" v={(f.tags_ai as string[]).join(", ")} /> : null}
        {f.transcript ? <Card style={{ marginTop: 8 }}><T dim size={13}>Voice note</T><T selectable>“{f.transcript}”</T></Card> : null}
      </Section>

      {["negotiating", "vetting", "ordered", "qc", "shipped", "landed"].includes(f.stage) ? (
        <Section title="Vetting (required before ordering)">
          <Card>
            {cfg.vetting_checklist.map((i) => (
              <HRow key={i.key} style={{ justifyContent: "space-between", paddingVertical: 6 }}>
                <T size={14} style={{ flex: 1 }}>{i.label}</T>
                <Switch value={!!vetting?.checklist?.[i.key]?.done} onValueChange={(v) => setVet(i.key, v)} />
              </HRow>
            ))}
            <EditField key={`ovr-${vetting?.override_reason}`} label="Override reason (logged, shown in red)" value={vetting?.override_reason}
              onSave={(v) => vetting ? patch("vetting", vetting.id, { override_reason: v || null }) : insert("vetting", { find_id: f.id, checklist: {}, override_reason: v || null })} />
          </Card>
        </Section>
      ) : null}

      <Section title="Samples" right={<Button title="+ Sample" kind="ghost" onPress={() => insert("samples", { find_id: f.id, supplier_id: f.supplier_id, status: "requested", carried_by: me })} />}>
        {samples.map((s) => (
          <Card key={s.id}>
            <HRow>{["requested", "paid", "in_hand", "shipping", "arrived"].map((st) => <Chip key={st} label={st.replace("_", " ")} active={s.status === st} onPress={() => { patch("samples", s.id, { status: st }); if (st === "in_hand" && ["found", "shortlisted", "quote_requested", "quote_received", "sample_requested"].includes(f.stage)) setStage("sample_in_hand"); }} />)}</HRow>
            <EditField key={`bag-${s.bag_label}`} label="Which bag?" value={s.bag_label} placeholder="Mahdy – grey suitcase" onSave={(v) => patch("samples", s.id, { bag_label: v || null })} />
            <HRow>{[...people.entries()].map(([pid, p]) => <Chip key={pid} label={p.name} active={s.carried_by === pid} onPress={() => patch("samples", s.id, { carried_by: pid })} color={p.color} />)}</HRow>
            <HRow gap={8} style={{ marginTop: 8 }}>
              <View style={{ flex: 1 }}><EditField key={`paid-${s.paid_cents}`} label="Paid $" value={s.paid_cents != null ? s.paid_cents / 100 : null} numeric onSave={(v) => patch("samples", s.id, { paid_cents: num(v) == null ? null : Math.round(num(v)! * 100) })} /></View>
              <View style={{ flex: 1 }}><EditField key={`dec-${s.declared_value_cents}`} label="Declared $" value={s.declared_value_cents != null ? s.declared_value_cents / 100 : null} numeric onSave={(v) => patch("samples", s.id, { declared_value_cents: num(v) == null ? null : Math.round(num(v)! * 100) })} /></View>
            </HRow>
          </Card>
        ))}
      </Section>

      <Button title="Delete this find" kind="ghost" style={{ marginTop: 30 }} onPress={() => Alert.alert("Delete?", "It disappears for everyone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => { softDelete("finds", f.id); router.back(); } },
      ])} />
    </Screen>
  );
}
