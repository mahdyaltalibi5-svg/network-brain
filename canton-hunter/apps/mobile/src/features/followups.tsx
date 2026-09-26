/** Follow-up Center: the fair is the start; the money is in following up. Bilingual drafts, sent by hand. */
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { findTitle } from "@/lib/data";
import { all, get, insert, myId, patch, useTable, type Row } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { syncNow, syncSoon } from "@/lib/sync";
import { Badge, Button, C, Card, Chip, Empty, Field, Row as HRow, Screen, Section, T } from "@/ui/kit";

const ACTIVE = ["shortlisted", "quote_requested", "quote_received", "sample_requested", "sample_in_hand", "testing", "negotiating"];
const PURPOSES = ["quote", "sample", "negotiate", "order"] as const;
const NEXT_STAGE: Record<string, string> = { quote: "quote_requested", sample: "sample_requested", negotiate: "negotiating", order: "vetting" };

/** Ask the server to draft (or redraft) a follow-up for one supplier. */
export async function requestDraft(supplierId: string, purpose: string, existing?: Row) {
  await syncNow();
  let id = existing?.id;
  if (!id) id = insert("followups", { supplier_id: supplierId, purpose, status: "drafting", find_ids: [] }).id;
  else patch("followups", id, { status: "drafting", purpose });
  await syncNow();
  const { error } = await supabase.rpc("request_job", { p_type: "draft_followups", p_payload: { supplier_id: supplierId, followup_id: id, purpose } });
  if (error) Alert.alert("Needs internet", error.message);
}

function advanceFinds(fu: Row, toStage: string) {
  const order = ["found", "shortlisted", "quote_requested", "quote_received", "sample_requested", "sample_in_hand", "testing", "negotiating", "vetting"];
  for (const id of fu.find_ids ?? []) {
    const f = get("finds", id);
    if (f && order.indexOf(f.stage) >= 0 && order.indexOf(f.stage) < order.indexOf(toStage)) {
      insert("pipeline_events", { find_id: f.id, from_stage: f.stage, to_stage: toStage, by_user: myId(), note: `Follow-up (${fu.purpose})` });
      patch("finds", f.id, { stage: toStage });
    }
  }
}

function FollowupCard({ fu }: { fu: Row }) {
  const s = get("suppliers", fu.supplier_id);
  const [showEn, setShowEn] = useState(false);
  const [notes, setNotes] = useState(fu.reply_notes ?? "");
  if (!s) return null;
  const finds = (fu.find_ids ?? []).map((id: string) => get("finds", id)).filter(Boolean) as Row[];
  const email = s.emails?.[0];

  function markSent() {
    patch("followups", fu.id, { status: "sent", sent_at: new Date().toISOString(), sent_by: myId() });
    advanceFinds(fu, NEXT_STAGE[fu.purpose] ?? "quote_requested");
    syncSoon();
  }
  function markReplied() {
    patch("followups", fu.id, { status: "replied", reply_notes: notes || null });
    if (fu.purpose === "quote") advanceFinds(fu, "quote_received");
    syncSoon();
  }

  return (
    <Card style={fu.status === "sent" ? { borderColor: C.blue } : fu.status === "replied" ? { borderColor: C.good } : undefined}>
      <HRow style={{ justifyContent: "space-between" }}>
        <T bold style={{ flex: 1 }}>{s.name_en ?? s.name_cn ?? "Supplier"}</T>
        <Badge label={`${fu.purpose} · ${fu.status}`} color={fu.status === "draft" ? C.warn : fu.status === "replied" ? "#1d5c43" : C.card2} />
      </HRow>
      <T dim size={12}>{[s.contact_name, s.booth_code, s.wechat_id && `WeChat ${s.wechat_id}`, email].filter(Boolean).join(" · ")}</T>
      <T dim size={12} numberOfLines={2}>{finds.map(findTitle).join(", ")}</T>
      {fu.status === "drafting" ? <T style={{ marginTop: 8 }}>✍️ Drafting… (about 20 seconds)</T> : null}
      {fu.body_zh ? (
        <View style={{ marginTop: 8, backgroundColor: C.card2, borderRadius: 12, padding: 10 }}>
          <T selectable size={15}>{showEn ? fu.body_en : fu.body_zh}</T>
          <Chip label={showEn ? "Show 中文" : "Show English"} onPress={() => setShowEn(!showEn)} />
        </View>
      ) : null}
      {fu.body_zh ? (
        <HRow style={{ marginTop: 8 }}>
          <Button title="Copy 中文" onPress={() => { void Clipboard.setStringAsync(fu.body_zh); Alert.alert("Copied", "Paste it in WeChat."); }} />
          <Button title="WeChat" kind="secondary" onPress={() => Linking.openURL("weixin://").catch(() => Alert.alert("WeChat not installed"))} />
          {email ? <Button title="Email" kind="secondary" onPress={() => Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(fu.subject ?? "")}&body=${encodeURIComponent(`${fu.body_zh}\n\n---\n\n${fu.body_en}`)}`)} /> : null}
        </HRow>
      ) : null}
      <HRow style={{ marginTop: 8 }}>
        {fu.status === "draft" ? <Button title="✓ Mark sent" kind="good" onPress={markSent} /> : null}
        <Button title="Redraft" kind="ghost" onPress={() => requestDraft(fu.supplier_id, fu.purpose, fu)} />
        {finds[0] ? <Button title="Open find" kind="ghost" onPress={() => router.push(`/find/${finds[0]!.id}`)} /> : null}
      </HRow>
      {fu.status === "sent" || fu.status === "replied" ? (
        <View style={{ marginTop: 8 }}>
          <Field placeholder="What did they reply? (prices, MOQ…)" value={notes} onChangeText={setNotes} multiline />
          {fu.status === "sent" ? <Button title="Mark replied" kind="secondary" onPress={markReplied} /> : <Button title="Save notes" kind="ghost" onPress={() => patch("followups", fu.id, { reply_notes: notes || null })} />}
        </View>
      ) : null}
      {fu.status !== "draft" && fu.status !== "drafting" ? (
        <HRow style={{ marginTop: 8 }}>
          <T dim size={12}>Next:</T>
          {PURPOSES.filter((p) => p !== fu.purpose).map((p) => <Chip key={p} label={p} onPress={() => requestDraft(fu.supplier_id, p)} />)}
        </HRow>
      ) : null}
    </Card>
  );
}

export function FollowupsScreen() {
  const followups = useTable("followups");
  const finds = useTable("finds");
  useTable("suppliers");
  const [busy, setBusy] = useState(false);

  const needs = useMemo(() => {
    const has = new Set(followups.map((f) => f.supplier_id));
    const ids = new Set<string>();
    for (const f of finds) if (f.supplier_id && ACTIVE.includes(f.stage) && !has.has(f.supplier_id)) ids.add(f.supplier_id);
    return [...ids];
  }, [followups, finds]);
  const byStatus = (st: string[]) => followups.filter((f) => st.includes(f.status)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  async function draftAll() {
    setBusy(true);
    await syncNow();
    const { error } = await supabase.rpc("request_job", { p_type: "draft_followups", p_payload: {} });
    setBusy(false);
    Alert.alert(error ? "Needs internet" : "Drafting", error?.message ?? `Writing messages for ${needs.length} suppliers. You'll get a notification.`);
  }

  return (
    <Screen>
      <T dim>Suppliers with shortlisted products get a bilingual message. Copy the 中文, paste in WeChat, mark sent.</T>
      {needs.length ? (
        <Section title={`Needs a follow-up (${needs.length})`}>
          <Button title={`✍️ Draft all ${needs.length}`} onPress={draftAll} busy={busy} big />
          {needs.map((sid) => {
            const s = all("suppliers").find((x) => x.id === sid);
            return (
              <Card key={sid} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <T style={{ flex: 1 }}>{s?.name_en ?? s?.name_cn ?? "Supplier"}</T>
                <Button title="Draft" kind="secondary" onPress={() => requestDraft(sid, "quote")} />
              </Card>
            );
          })}
        </Section>
      ) : null}
      <Section title="Ready to send">{byStatus(["drafting", "draft"]).map((fu) => <FollowupCard key={fu.id} fu={fu} />)}</Section>
      <Section title="Waiting for reply">{byStatus(["sent"]).map((fu) => <FollowupCard key={fu.id} fu={fu} />)}</Section>
      <Section title="Replied">{byStatus(["replied"]).map((fu) => <FollowupCard key={fu.id} fu={fu} />)}</Section>
      {!followups.length && !needs.length ? <Empty text="Shortlist some finds first (Nightly Review → 🔥 Test)." /> : null}
    </Screen>
  );
}
