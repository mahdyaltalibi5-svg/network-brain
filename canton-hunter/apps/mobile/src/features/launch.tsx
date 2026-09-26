import type { LaunchPlan } from "@canton/core";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Alert, Linking, View } from "react-native";
import { findTitle } from "@/lib/data";
import { all, patch, useRow, useTable } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { syncNow, syncSoon } from "@/lib/sync";
import { Badge, Button, C, Card, Chip, Field, KV, Row, Screen, Section, T } from "@/ui/kit";

const STEPS = ["draft", "planning", "plan_ready", "approved", "building", "built", "live"] as const;

async function action(id: string, act: string) {
  await syncNow(); // make sure the server has our latest edits first
  const { error } = await supabase.rpc("launch_action", { p_launch_id: id, p_action: act });
  if (error) { Alert.alert("Couldn't do that", error.message); return false; }
  syncSoon(3000);
  return true;
}

export function LaunchScreen({ id }: { id: string }) {
  const l = useRow("launches", id);
  useTable("launch_metrics");
  const f = useRow("finds", l?.find_id);
  const [busy, setBusy] = useState<string | null>(null);
  if (!l) return <Screen><T dim>Syncing…</T></Screen>;
  const plan = l.plan as LaunchPlan | null;
  const metrics = all("launch_metrics").filter((m) => m.launch_id === id).sort((a, b) => b.date.localeCompare(a.date));
  const totals = metrics.reduce((a, m) => ({ spend: a.spend + m.spend_cents, clicks: a.clicks + m.clicks, impr: a.impr + m.impressions }), { spend: 0, clicks: 0, impr: 0 });
  const latest = metrics[0];

  const run = async (act: string) => { setBusy(act); await action(id, act); setBusy(null); };
  const editPlan = (fn: (p: LaunchPlan) => LaunchPlan) => plan && patch("launches", id, { plan: fn(structuredClone(plan)) });

  function goLive() {
    Alert.alert(
      "Turn on ads?",
      `This starts spending REAL money: about $10/day on Meta for “${plan?.copy.title}”. You can pause any time.`,
      [{ text: "Cancel", style: "cancel" }, { text: "Go live", style: "destructive", onPress: () => void run("activate") }],
    );
  }

  return (
    <Screen>
      <T size={22} bold>{f ? findTitle(f) : "Launch"}</T>
      <Row style={{ marginVertical: 10 }}>
        {STEPS.map((s) => <Badge key={s} label={s.replace("_", " ")} color={s === l.status ? C.accent : STEPS.indexOf(s) < STEPS.indexOf(l.status) ? "#1d5c43" : C.card2} />)}
        {["paused", "killed", "error"].includes(l.status) ? <Badge label={l.status} color={C.bad} /> : null}
      </Row>
      {l.last_error ? <Card style={{ borderColor: C.bad }}><T style={{ color: C.bad }}>{l.last_error}</T></Card> : null}

      {!plan ? (
        <Card>
          <T style={{ marginBottom: 10 }}>Claude writes the positioning, landing page copy, ad scripts and a $10/day test plan from everything we know about this product.</T>
          <Button title={l.status === "planning" ? "Writing plan…" : "Generate launch plan"} busy={busy === "plan" || l.status === "planning"} onPress={() => run("plan")} big />
        </Card>
      ) : (
        <>
          <Section title="Offer">
            <Row>
              {(["waitlist", "preorder"] as const).map((m) => <Chip key={m} label={m} active={(l.mode ?? plan.offer.mode) === m} onPress={() => patch("launches", id, { mode: m })} />)}
            </Row>
            <T dim size={13} style={{ marginTop: 6 }}>{plan.offer.reason}</T>
            <Row gap={8} style={{ marginTop: 8 }}>
              <View style={{ flex: 1 }}><Field label="Price $" keyboardType="decimal-pad" defaultValue={((l.price_cents ?? 0) / 100).toFixed(2)} onEndEditing={(e) => patch("launches", id, { price_cents: Math.round(Number(e.nativeEvent.text) * 100) })} /></View>
              <View style={{ flex: 1 }}><Field label="Ship-by date" defaultValue={l.ship_by_date ?? ""} placeholder="YYYY-MM-DD" onEndEditing={(e) => patch("launches", id, { ship_by_date: e.nativeEvent.text || null })} /></View>
            </Row>
            {(l.mode ?? plan.offer.mode) === "preorder" ? <T size={12} style={{ color: C.warn }}>Preorders: ship by the stated date, or email buyers and offer a refund (FTC Mail Order Rule).</T> : null}
          </Section>

          <Section title="Landing page copy">
            <Field label="Title" defaultValue={plan.copy.title} onEndEditing={(e) => editPlan((p) => { p.copy.title = e.nativeEvent.text; return p; })} />
            <Field label="Description" multiline defaultValue={plan.copy.description} onEndEditing={(e) => editPlan((p) => { p.copy.description = e.nativeEvent.text; return p; })} />
            {plan.copy.bullets.map((b, i) => <Field key={i} label={`Bullet ${i + 1}`} defaultValue={b} onEndEditing={(e) => editPlan((p) => { p.copy.bullets[i] = e.nativeEvent.text; return p; })} />)}
            <T dim size={13}>Positioning: {plan.positioning}</T>
            <T dim size={13}>Customer: {plan.target_customer}</T>
          </Section>

          <Section title="Ad scripts (shoot these)">
            {plan.ad_scripts.map((a, i) => (
              <Card key={i}>
                <T bold>🪝 {a.hook}</T>
                <T style={{ marginTop: 4 }}>{a.body}</T>
                <T dim size={13} style={{ marginTop: 4 }}>CTA: {a.cta}</T>
                {a.shot_list.map((s, k) => <T key={k} size={13}>• {s}</T>)}
                {a.uses_existing_footage ? <Badge label="fair footage works" color="#1d5c43" /> : null}
                <Button title="Copy" kind="ghost" onPress={() => { void Clipboard.setStringAsync(`${a.hook}\n\n${a.body}\n\n${a.cta}\n\nShots:\n${a.shot_list.join("\n")}`); }} style={{ marginTop: 6 }} />
              </Card>
            ))}
          </Section>

          <Section title="Meta ad copy">
            {plan.meta.headlines.map((h, i) => <Field key={`h${i}`} label={`Headline ${i + 1}`} defaultValue={h} onEndEditing={(e) => editPlan((p) => { p.meta.headlines[i] = e.nativeEvent.text; return p; })} />)}
            {plan.meta.primary_texts.map((t, i) => <Field key={`t${i}`} label={`Primary text ${i + 1}`} multiline defaultValue={t} onEndEditing={(e) => editPlan((p) => { p.meta.primary_texts[i] = e.nativeEvent.text; return p; })} />)}
          </Section>

          <Section title="Test plan">
            <Card>
              <KV k="Budget" v={`$${plan.test_plan.daily_budget_usd}/day × ${plan.test_plan.days} days`} />
              <T style={{ marginTop: 6 }}>{plan.test_plan.success_looks_like}</T>
              <T dim size={13} style={{ marginTop: 6 }}>{plan.test_plan.notes}</T>
            </Card>
          </Section>

          <Section title="Next step">
            {l.status === "plan_ready" || l.status === "planning" ? (
              <>
                <Button title="✓ Approve plan" onPress={() => run("approve")} busy={busy === "approve"} big />
                <Button title="Regenerate plan" kind="ghost" onPress={() => run("plan")} style={{ marginTop: 8 }} />
              </>
            ) : null}
            {l.status === "approved" || (l.status === "error" && !l.meta_campaign_id) ? (
              <Button title="Build page + ads (ads stay PAUSED)" onPress={() => run("build")} busy={busy === "build"} big />
            ) : null}
            {l.status === "building" ? <T dim>Building the Shopify page and Meta campaign… you'll get a notification.</T> : null}
            {l.landing_url ? <Button title="Open landing page" kind="secondary" onPress={() => Linking.openURL(l.landing_url)} style={{ marginTop: 8 }} /> : null}
            {l.meta_campaign_id && l.meta_status !== "active" && l.status !== "killed" ? (
              <Button title="🚀 Go live ($10/day)" kind="danger" onPress={goLive} busy={busy === "activate"} big style={{ marginTop: 8 }} />
            ) : null}
            {l.meta_status === "active" ? (
              <Row style={{ marginTop: 8 }}>
                <Button title="⏸ Pause ads" kind="secondary" onPress={() => run("pause")} busy={busy === "pause"} />
                <Button title="🛑 Kill test" kind="danger" onPress={() => Alert.alert("Kill this test?", "Pauses ads and marks the product killed.", [{ text: "Cancel", style: "cancel" }, { text: "Kill", style: "destructive", onPress: () => void run("kill") }])} />
              </Row>
            ) : null}
          </Section>
        </>
      )}

      {metrics.length ? (
        <Section title="Results">
          {latest?.recommendation ? (
            <Card style={{ borderColor: latest.recommendation === "kill" ? C.bad : latest.recommendation === "scale" ? C.good : C.line }}>
              <T bold size={18}>{latest.recommendation === "kill" ? "🛑 Recommend: kill" : latest.recommendation === "scale" ? "📈 Recommend: scale" : "⏳ Keep testing"}</T>
              {(latest.reasons ?? []).map((r: string) => <T key={r} dim size={13}>{r}</T>)}
            </Card>
          ) : null}
          <Card>
            <KV k="Spend" v={`$${(totals.spend / 100).toFixed(2)}`} />
            <KV k="CTR" v={totals.impr ? `${((totals.clicks / totals.impr) * 100).toFixed(2)}%` : "—"} />
            <KV k="Clicks" v={String(totals.clicks)} />
            <KV k={l.mode === "preorder" ? "Preorders" : "Waitlist signups"} v={String(l.mode === "preorder" ? latest?.preorders ?? 0 : latest?.waitlist_signups ?? 0)} />
          </Card>
          <Button title="Refresh numbers" kind="ghost" onPress={async () => { await supabase.rpc("request_job", { p_type: "metrics_pull", p_payload: { launch_id: id } }); Alert.alert("Pulling numbers…"); }} />
        </Section>
      ) : null}
    </Screen>
  );
}
