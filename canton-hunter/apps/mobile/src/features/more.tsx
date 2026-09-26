import { CONFIG_DEFAULTS, QUICK_PHRASES, SUPPLIER_QUESTIONS } from "@canton/core";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";
import { fairDay, findTitle, formatMoney, usePeople } from "@/lib/data";
import { all, insert, kvGet, kvSet, myId, patch, softDelete, sqlite, useTable, wipeLocal, type Row } from "@/lib/store";
import { api, supabase } from "@/lib/supabase";
import { refreshCounts, syncNow, useSyncStatus } from "@/lib/sync";
import { runUploads, uploadStats } from "@/lib/upload";
import { Badge, Button, C, Card, Chip, Empty, Field, KV, Row as HRow, Screen, Section, T } from "@/ui/kit";

export function MoreScreen() {
  const sync = useSyncStatus();
  const dupes = useTable("supplier_dupe_candidates").filter((d) => d.status === "open");
  const config = useTable("config");
  const unverified = config.filter((c) => !c.verified_at).length;
  const drafts = useTable("followups").filter((f) => f.status === "draft").length;
  const followNote = drafts ? `${drafts} to send` : undefined;
  const links: [string, string, string?][] = [
    ["Supplier questions", "/phrasebook"],
    ["Translate", "/translate"],
    ["Follow-ups", "/followups", followNote],
    ["Trip dashboard", "/dashboard"],
    ["Hunt list", "/hunt"],
    ["Hall plan", "/halls"],
    ["Samples & packing", "/samples"],
    ["Suppliers", "/suppliers", dupes.length ? `${dupes.length} possible duplicates` : undefined],
    ["Settings", "/settings", unverified ? `${unverified} unverified` : undefined],
    ["Sync", "/sync", sync.lastError ? "error" : sync.pendingChanges + sync.pendingUploads ? `${sync.pendingChanges + sync.pendingUploads} waiting` : undefined],
  ];
  return (
    <Screen>
      <T size={30} bold style={{ marginBottom: 16, fontWeight: "700" }}>More</T>
      <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: "hidden" }}>
        {links.map(([label, href, note], i) => (
          <Pressable key={href} onPress={() => router.push(href as never)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingVertical: 15, paddingHorizontal: 16, gap: 10 },
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line }, pressed && { backgroundColor: "#FAFAF9" }]}>
            <T size={16} style={{ flex: 1 }}>{label}</T>
            {note ? <T size={14} style={{ color: note.includes("error") || note.includes("unverified") || note.includes("duplicates") || note.includes("to send") ? C.warn : C.dim }}>{note}</T> : null}
            <T size={18} dim>›</T>
          </Pressable>
        ))}
      </View>
      <Button title="Sign out" kind="ghost" style={{ marginTop: 20 }} onPress={() => Alert.alert("Sign out?", sync.pendingChanges + sync.pendingUploads > 0 ? "You have unsynced data on this phone! Sync first." : "Local data will be cleared.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: async () => { await supabase.auth.signOut(); wipeLocal(); } },
      ])} />
    </Screen>
  );
}

export function PhrasebookScreen() {
  const [big, setBig] = useState<string | null>(null);
  if (big) {
    return (
      <Pressable onPress={() => setBig(null)} style={{ flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" }}>
        <T size={44} bold style={{ color: "#000", textAlign: "center" }}>{big}</T>
        <T size={14} style={{ color: "#666", textAlign: "center", marginTop: 24 }}>Tap to close</T>
      </Pressable>
    );
  }
  return (
    <Screen>
      <T dim style={{ marginBottom: 10 }}>Tap one to show it full-screen to the supplier. Works offline.</T>
      {[...SUPPLIER_QUESTIONS, ...QUICK_PHRASES].map((p) => (
        <Card key={p.key} onPress={() => setBig(p.zh)}>
          <T size={20} bold>{p.zh}</T>
          <T dim>{p.en}</T>
        </Card>
      ))}
    </Screen>
  );
}

export function TranslateScreen() {
  const [text, setText] = useState("");
  const [to, setTo] = useState<"zh" | "en">("zh");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ src: string; out: string; pinyin: string | null }[]>(() => kvGet("translations") ?? []);
  async function go() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ translation: string; pinyin: string | null }>({ action: "translate", text, to });
      const h = [{ src: text, out: r.translation, pinyin: r.pinyin }, ...history].slice(0, 50);
      setHistory(h);
      kvSet("translations", h);
      setText("");
    } catch (e) {
      Alert.alert("Needs internet", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <HRow style={{ marginBottom: 10 }}>
        <Chip label="English → 中文" active={to === "zh"} onPress={() => setTo("zh")} />
        <Chip label="中文 → English" active={to === "en"} onPress={() => setTo("en")} />
      </HRow>
      <Field placeholder="Type or dictate (mic on keyboard)…" value={text} onChangeText={setText} multiline />
      <Button title="Translate" onPress={go} busy={busy} big />
      {history.map((h, i) => (
        <Card key={i} onPress={() => { void Clipboard.setStringAsync(h.out); }}>
          <T size={i === 0 ? 30 : 20} bold selectable>{h.out}</T>
          {h.pinyin ? <T dim>{h.pinyin}</T> : null}
          <T dim size={13} style={{ marginTop: 4 }}>{h.src}</T>
        </Card>
      ))}
    </Screen>
  );
}

export function HuntScreen() {
  const items = useTable("hunt_items");
  const finds = useTable("finds");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const sorted = [...items].sort((a, b) => a.priority - b.priority);
  async function generate() {
    setBusy(true);
    const { error } = await supabase.rpc("request_job", { p_type: "build_hunt_list", p_payload: {} });
    setBusy(false);
    Alert.alert(error ? "Needs internet" : "Researching", error?.message ?? "Claude is researching trends. New items appear in a few minutes.");
  }
  return (
    <Screen>
      <T dim>What we're hunting for. Finds that match are marked on the feed.</T>
      <Button title="Generate from trends" onPress={generate} busy={busy} style={{ marginVertical: 10 }} />
      <HRow>
        <View style={{ flex: 1 }}><Field placeholder="Add an item…" value={title} onChangeText={setTitle} /></View>
        <Button title="Add" style={{ marginBottom: 10 }} onPress={() => { if (title.trim()) { insert("hunt_items", { title: title.trim(), priority: 3, source_urls: [] }); setTitle(""); } }} />
      </HRow>
      {sorted.length === 0 ? <Empty text="Empty. Generate it before the trip." /> : null}
      {sorted.map((h) => {
        const matched = finds.filter((f) => f.hunt_item_id === h.id).length;
        return (
          <Card key={h.id}>
            <HRow style={{ justifyContent: "space-between" }}>
              <T bold style={{ flex: 1 }}>P{h.priority} · {h.title}</T>
              {matched ? <Badge label={`${matched} found`} color={C.good} /> : null}
            </HRow>
            {h.why ? <T dim size={13}>{h.why}</T> : null}
            {h.target_fob_cents || h.target_retail_cents ? <T size={13}>Target FOB {formatMoney(h.target_fob_cents)} → retail {formatMoney(h.target_retail_cents)}</T> : null}
            <HRow style={{ marginTop: 6 }}>
              {[1, 2, 3].map((p) => <Chip key={p} label={`P${p}`} active={h.priority === p} onPress={() => patch("hunt_items", h.id, { priority: p })} />)}
              <Button title="Remove" kind="ghost" onPress={() => softDelete("hunt_items", h.id)} />
            </HRow>
          </Card>
        );
      })}
    </Screen>
  );
}

export function HallsScreen() {
  const rows = useTable("hall_assignments");
  const people = usePeople();
  const [date, setDate] = useState(fairDay(new Date().toISOString()));
  return (
    <Screen>
      <T dim>Split the halls so nobody logs the same booth twice. Your hall becomes the default on Capture.</T>
      <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      {[...people.entries()].map(([pid, p]) => {
        const row = rows.find((r) => r.user_id === pid && r.date === date);
        return (
          <Card key={pid}>
            <HRow><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} /><T bold>{p.name}</T></HRow>
            <Field placeholder="Halls, e.g. 9.1, 9.2, 10.1" defaultValue={(row?.halls ?? []).join(", ")} key={`${pid}-${date}-${row?.id}`}
              onEndEditing={(e) => {
                const halls = e.nativeEvent.text.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
                if (row) patch("hall_assignments", row.id, { halls });
                else insert("hall_assignments", { date, user_id: pid, halls });
                if (pid === myId() && date === fairDay(new Date().toISOString())) kvSet("hall", halls[0] ?? null);
              }} />
          </Card>
        );
      })}
    </Screen>
  );
}

export function SamplesScreen() {
  const samples = useTable("samples");
  const people = usePeople();
  useTable("finds");
  const byBag = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const s of samples) {
      const k = `${people.get(s.carried_by)?.name ?? "Nobody"} · ${s.bag_label ?? "no bag set"}`;
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()].sort();
  }, [samples, people]);
  const total = (rows: Row[], k: string) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  return (
    <Screen>
      <T dim>Packing list by person and bag. Declared values are for customs.</T>
      {byBag.length === 0 ? <Empty text="No samples yet. Add them from a find." /> : null}
      {byBag.map(([bag, rows]) => (
        <Section key={bag} title={`${bag} (${rows.length})`}>
          {rows.map((s) => {
            const f = all("finds").find((x) => x.id === s.find_id);
            return (
              <Card key={s.id} onPress={() => f && router.push(`/find/${f.id}`)}>
                <T bold>{f ? findTitle(f) : "Sample"}</T>
                <T dim size={13}>{s.status.replace("_", " ")} · paid {formatMoney(s.paid_cents)} · declared {formatMoney(s.declared_value_cents)}</T>
              </Card>
            );
          })}
          <T dim size={13}>Bag total: paid {formatMoney(total(rows, "paid_cents"))} · declared {formatMoney(total(rows, "declared_value_cents"))}</T>
        </Section>
      ))}
    </Screen>
  );
}

export function SuppliersScreen() {
  const suppliers = useTable("suppliers").filter((s) => !s.merged_into_id);
  const dupes = useTable("supplier_dupe_candidates").filter((d) => d.status === "open");
  const finds = useTable("finds");
  const [q, setQ] = useState("");
  const name = (s?: Row) => s?.name_en ?? s?.name_cn ?? "Unknown";
  function merge(d: Row) {
    // keep A, fold B into it
    for (const f of all("finds").filter((x) => x.supplier_id === d.supplier_b)) patch("finds", f.id, { supplier_id: d.supplier_a });
    patch("suppliers", d.supplier_b, { merged_into_id: d.supplier_a });
    patch("supplier_dupe_candidates", d.id, { status: "merged" });
  }
  const list = suppliers.filter((s) => !q || `${s.name_en} ${s.name_cn} ${s.booth_code} ${s.contact_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      {dupes.map((d) => {
        const a = all("suppliers").find((s) => s.id === d.supplier_a);
        const b = all("suppliers").find((s) => s.id === d.supplier_b);
        return (
          <Card key={d.id} style={{ borderColor: C.warn }}>
            <T bold>Same supplier?</T>
            <T>{name(a)} ({a?.booth_code ?? "?"})</T>
            <T>{name(b)} ({b?.booth_code ?? "?"})</T>
            <T dim size={13}>{(d.reasons ?? []).join(", ")}</T>
            <HRow style={{ marginTop: 8 }}>
              <Button title="Merge" onPress={() => merge(d)} />
              <Button title="Different" kind="ghost" onPress={() => patch("supplier_dupe_candidates", d.id, { status: "dismissed" })} />
            </HRow>
          </Card>
        );
      })}
      <Field placeholder="Search suppliers…" value={q} onChangeText={setQ} />
      {list.map((s) => {
        const n = finds.filter((f) => f.supplier_id === s.id).length;
        const first = finds.find((f) => f.supplier_id === s.id);
        return (
          <Card key={s.id} onPress={() => first && router.push(`/find/${first.id}`)}>
            <T bold>{name(s)}</T>
            <T dim size={13}>{[s.hall && `Hall ${s.hall}`, s.booth_code, s.contact_name, s.wechat_id && `WeChat ${s.wechat_id}`].filter(Boolean).join(" · ")}</T>
            <T size={13}>{n} find{n === 1 ? "" : "s"}</T>
          </Card>
        );
      })}
    </Screen>
  );
}

export function SettingsScreen() {
  const config = useTable("config");
  async function markVerified(k: string, value: unknown) {
    const { error } = await supabase.rpc("set_config", { k, v: value, verified: true });
    if (error) Alert.alert("Needs internet", error.message);
    else void syncNow();
  }
  async function saveJson(k: string, text: string) {
    try {
      const v = JSON.parse(text);
      const { error } = await supabase.rpc("set_config", { k, v, verified: false });
      if (error) throw error;
      void syncNow();
      Alert.alert("Saved");
    } catch (e) {
      Alert.alert("Not saved", e instanceof Error ? e.message : "Invalid JSON");
    }
  }
  return (
    <Screen>
      <T dim>These numbers drive margins and scores. They are placeholders until someone checks them (see docs/VERIFY.md) and taps Verified.</T>
      {Object.keys(CONFIG_DEFAULTS).map((k) => {
        const row = config.find((c) => c.key === k);
        const value = row?.value ?? CONFIG_DEFAULTS[k]!.value;
        return (
          <Section key={k} title={k} right={row?.verified_at ? <Badge label={`verified ${row.verified_at}`} color={C.goodBg} /> : <Badge label="UNVERIFIED" color={C.warn} />}>
            <T dim size={13}>{row?.note ?? CONFIG_DEFAULTS[k]!.note}</T>
            <Field multiline defaultValue={JSON.stringify(value, null, 2)} key={`${k}-${row?.updated_at}`} style={{ fontFamily: "Menlo", fontSize: 12 }} onEndEditing={(e) => saveJson(k, e.nativeEvent.text)} />
            <Button title="Mark verified" kind="secondary" onPress={() => markVerified(k, value)} />
          </Section>
        );
      })}
    </Screen>
  );
}

export function SyncScreen() {
  const s = useSyncStatus();
  const [, force] = useState(0);
  const errors = sqlite.getAllSync<{ tbl: string; row_id: string; last_error: string; attempts: number }>("SELECT tbl, row_id, last_error, attempts FROM outbox WHERE attempts > 0 LIMIT 20");
  const fileErrors = sqlite.getAllSync<{ media_id: string; last_error: string; attempts: number }>("SELECT media_id, last_error, attempts FROM files WHERE state = 'error' LIMIT 20");
  const up = uploadStats();
  async function exportCsv() {
    const rows = all("finds");
    const cols = ["captured_at", "hall", "booth_code", "title_ai", "fob_price_cents", "fob_currency", "moq", "gut", "stage", "transcript"];
    const esc = (v: unknown) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
    await Share.share({ message: [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") });
  }
  return (
    <Screen>
      <Card>
        <KV k="Connection" v={s.online ? "online" : "offline"} />
        <KV k="Last sync" v={s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleTimeString() : "never"} />
        <KV k="Changes waiting" v={String(s.pendingChanges)} />
        <KV k="Files waiting" v={`${up.pending}${up.failed ? ` (${up.failed} failed, retrying)` : ""}`} />
        {s.lastError ? <T style={{ color: C.bad, marginTop: 8 }}>{s.lastError}</T> : null}
      </Card>
      <Button title="Sync now" onPress={async () => { await syncNow(); await runUploads(); refreshCounts(); force((n) => n + 1); }} busy={s.running} big />
      {errors.length ? <Section title="Rejected changes (will retry)">{errors.map((e) => <T key={e.row_id} size={12} dim>{e.tbl} {e.row_id.slice(0, 8)} ×{e.attempts}: {e.last_error}</T>)}</Section> : null}
      {fileErrors.length ? <Section title="Upload errors (will retry)">{fileErrors.map((e) => <T key={e.media_id} size={12} dim>{e.media_id.slice(0, 8)} ×{e.attempts}: {e.last_error}</T>)}</Section> : null}
      <Button title="Share finds as CSV" kind="secondary" onPress={exportCsv} style={{ marginTop: 16 }} />
      <T dim size={12} style={{ marginTop: 10 }}>A full backup (JSON + CSV) is also saved on the server every night.</T>
    </Screen>
  );
}
