/**
 * JOURNAL: the shared notebook for the whole team. Every product logged at the fair, searchable and filterable,
 * with stars, tags and team notes. Phone: this is the whole app. Computer: plus Build and Manage.
 */
import { scoreFind } from "@canton/core";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { fairDay, findTitle, formatMoney, GUT_EMOJI, mediaFor, useConfig, useMediaSource, usePeople } from "@/lib/data";
import { all, get, myId, patch, searchFinds, useTable, type Row } from "@/lib/store";
import { useSyncStatus } from "@/lib/sync";
import { Button, C, Chip, Empty, Fab, isWeb, PageHeader, Row as HRow, Screen, SearchBar, T, useWide } from "@/ui/kit";

type Sort = "newest" | "oldest" | "cheapest" | "margin" | "score";
type View_ = "day" | "supplier";
const SORTS: [Sort, string][] = [["newest", "Newest"], ["oldest", "Oldest"], ["cheapest", "Cheapest"], ["margin", "Best margin"], ["score", "Top score"]];

function dayLabel(day: string): string {
  const today = fairDay(new Date().toISOString());
  const yesterday = fairDay(new Date(Date.now() - 86400_000).toISOString());
  const d = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
  return day === today ? `Today · ${d}` : day === yesterday ? `Yesterday · ${d}` : d;
}

function Photo({ f, size }: { f: Row; size?: number }) {
  const src = useMediaSource(mediaFor(f.id, "product_photo")[0]);
  const style = size ? { width: size, height: size, borderRadius: 10 } : { width: "100%" as const, aspectRatio: 16 / 10, borderTopLeftRadius: 14, borderTopRightRadius: 14 };
  return src ? <Image source={src} style={[style, { backgroundColor: C.card2 }]} contentFit="cover" cachePolicy="disk" /> : <View style={[style, { backgroundColor: C.card2 }]} />;
}

export function Star({ f, size = 20 }: { f: Row; size?: number }) {
  return (
    <Pressable hitSlop={10} onPress={() => patch("finds", f.id, { starred: !f.starred })}>
      <T size={size} style={{ color: f.starred ? "#B7791F" : "#C9C5C0" }}>{f.starred ? "★" : "☆"}</T>
    </Pressable>
  );
}

function meta(f: Row, person: string | undefined, notes: number) {
  const s = get("suppliers", f.supplier_id);
  return {
    where: [f.booth_code ?? (f.hall ? `Hall ${f.hall}` : null), s?.name_en ?? s?.name_cn].filter(Boolean).join(" · "),
    terms: [f.fob_price_cents != null ? `${formatMoney(f.fob_price_cents, f.fob_currency ?? "USD")} · MOQ ${f.moq ?? "?"}` : null, f.gut ? GUT_EMOJI[f.gut] : null, person].filter(Boolean).join(" · "),
    extra: [...(f.tags_user ?? []).map((t: string) => `#${t}`), notes ? `${notes} note${notes === 1 ? "" : "s"}` : null,
      f.processing_state === "pending" || f.processing_state === "processing" ? "AI reading…" : null].filter(Boolean).join("  "),
  };
}

function EntryRow({ f, person, notes }: { f: Row; person?: string; notes: number }) {
  const m = meta(f, person, notes);
  return (
    <Pressable onPress={() => router.push(`/find/${f.id}`)} style={({ pressed }) => [st.row, pressed && st.pressed]}>
      <Photo f={f} size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        <T size={16} bold numberOfLines={1}>{findTitle(f)}</T>
        {m.where ? <T dim size={14} numberOfLines={1}>{m.where}</T> : null}
        {m.terms ? <T dim size={14} numberOfLines={1}>{m.terms}</T> : null}
        {m.extra ? <T size={13} numberOfLines={1} style={{ color: C.text }}>{m.extra}</T> : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Star f={f} />
        <T size={12} dim>{new Date(f.captured_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</T>
      </View>
    </Pressable>
  );
}

function EntryTile({ f, person, notes }: { f: Row; person?: string; notes: number }) {
  const m = meta(f, person, notes);
  return (
    <Pressable onPress={() => router.push(`/find/${f.id}`)} style={({ pressed }) => [st.tile, pressed && st.pressed]}>
      <Photo f={f} />
      <View style={{ padding: 14, gap: 2 }}>
        <HRow style={{ flexWrap: "nowrap" }}>
          <T size={16} bold numberOfLines={1} style={{ flex: 1 }}>{findTitle(f)}</T>
          <Star f={f} />
        </HRow>
        <T dim size={14} numberOfLines={1}>{m.where || " "}</T>
        <T dim size={14} numberOfLines={1}>{m.terms || " "}</T>
        <T size={13} numberOfLines={1}>{m.extra || " "}</T>
      </View>
    </Pressable>
  );
}

function exportCsv(rows: Row[], people: Map<string, { name: string }>) {
  const cols: [string, (f: Row) => unknown][] = [
    ["date", (f) => f.captured_at], ["product", findTitle], ["booth", (f) => f.booth_code], ["hall", (f) => f.hall],
    ["supplier", (f) => get("suppliers", f.supplier_id)?.name_en ?? get("suppliers", f.supplier_id)?.name_cn],
    ["wechat", (f) => get("suppliers", f.supplier_id)?.wechat_id], ["price", (f) => (f.fob_price_cents != null ? f.fob_price_cents / 100 : "")],
    ["currency", (f) => f.fob_currency], ["moq", (f) => f.moq], ["lead_time_days", (f) => f.lead_time_days], ["rating", (f) => (f.gut ? GUT_EMOJI[f.gut] : "")],
    ["starred", (f) => (f.starred ? "yes" : "")], ["tags", (f) => (f.tags_user ?? []).join(" ")], ["by", (f) => people.get(f.captured_by)?.name], ["notes", (f) => f.transcript],
  ];
  const esc = (v: unknown) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
  const csv = [cols.map((c) => c[0]).join(","), ...rows.map((f) => cols.map(([, fn]) => esc(fn(f))).join(","))].join("\n");
  if (isWeb) {
    const a = globalThis.document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `canton-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  } else void Share.share({ message: csv });
}

export function JournalScreen() {
  const finds = useTable("finds");
  const notesAll = useTable("entry_notes");
  useTable("media"); useTable("suppliers"); useTable("research"); useTable("votes"); useTable("cost_calcs");
  const people = usePeople();
  const cfg = useConfig();
  const sync = useSyncStatus();
  const { wide, cols } = useWide();
  const [q, setQ] = useState("");
  const [rating, setRating] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [starred, setStarred] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<View_>("day");
  const [showFilters, setShowFilters] = useState(isWeb);

  const noteCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notesAll) m.set(n.find_id, (m.get(n.find_id) ?? 0) + 1);
    return m;
  }, [notesAll]);
  const allTags = useMemo(() => [...new Set(finds.flatMap((f) => f.tags_user ?? []))].sort(), [finds]);

  const rows = useMemo(() => {
    let r = [...finds];
    if (q.trim()) { const ids = new Set(searchFinds(q)); r = r.filter((f) => ids.has(f.id)); }
    if (rating) r = r.filter((f) => f.gut === rating);
    if (who) r = r.filter((f) => f.captured_by === who);
    if (starred) r = r.filter((f) => f.starred);
    if (tag) r = r.filter((f) => (f.tags_user ?? []).includes(tag));
    const usd = (f: Row) => (f.fob_price_cents == null ? Infinity : f.fob_price_cents / 100 / (f.fob_currency === "CNY" ? cfg.cost.cny_per_usd : 1));
    const scored = sort === "margin" || sort === "score"
      ? new Map(r.map((f) => [f.id, scoreFind(f as never, (all("research").find((x) => x.find_id === f.id) ?? null) as never,
          all("votes").filter((v) => v.find_id === f.id).map((v) => v.value), cfg, (all("cost_calcs").find((c) => c.find_id === f.id)?.inputs ?? {}) as never)]))
      : null;
    r.sort((a, b) => {
      switch (sort) {
        case "oldest": return a.captured_at.localeCompare(b.captured_at);
        case "cheapest": return usd(a) - usd(b);
        case "margin": return (scored!.get(b.id)!.cost?.margin_multiple ?? -1) - (scored!.get(a.id)!.cost?.margin_multiple ?? -1);
        case "score": return scored!.get(b.id)!.score.total - scored!.get(a.id)!.score.total;
        default: return b.captured_at.localeCompare(a.captured_at);
      }
    });
    return r;
  }, [finds, q, rating, who, starred, tag, sort, cfg]);

  const groups = useMemo(() => {
    const keyOf = (f: Row) => (view === "supplier"
      ? (get("suppliers", f.supplier_id)?.name_en ?? get("suppliers", f.supplier_id)?.name_cn ?? f.booth_code ?? "No supplier yet")
      : fairDay(f.captured_at));
    const m = new Map<string, Row[]>();
    for (const f of rows) m.set(keyOf(f), [...(m.get(keyOf(f)) ?? []), f]);
    const entries = [...m.entries()];
    if (view === "day" && (sort === "newest" || sort === "oldest")) entries.sort(([a], [b]) => (sort === "newest" ? b.localeCompare(a) : a.localeCompare(b)));
    return entries;
  }, [rows, view, sort]);

  const today = fairDay(new Date().toISOString());
  const todayCount = finds.filter((f) => fairDay(f.captured_at) === today).length;
  const mine = finds.filter((f) => f.captured_by === myId() && fairDay(f.captured_at) === today).length;
  const pending = sync.pendingChanges + sync.pendingUploads;
  const filtered = !!(q.trim() || rating || who || starred || tag);
  const clear = () => { setQ(""); setRating(null); setWho(null); setStarred(false); setTag(null); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen>
        <PageHeader
          title="Journal"
          subtitle={`${finds.length} entries · ${todayCount} today (${mine} yours)${pending ? ` · ${pending} waiting to sync` : ""}`}
          right={isWeb ? <Button title="Export CSV" kind="secondary" onPress={() => exportCsv(rows, people)} /> : <Button title="Tools" kind="secondary" onPress={() => router.push("/tools")} />}
        />
        <SearchBar value={q} onChangeText={setQ} placeholder="Search products, suppliers, booths, tags, notes…" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          <Chip label="Starred" active={starred} onPress={() => setStarred(!starred)} />
          <Chip label="Winners" active={rating === "fire"} onPress={() => setRating(rating === "fire" ? null : "fire")} />
          <Chip label={view === "day" ? "By day" : "By supplier"} onPress={() => setView(view === "day" ? "supplier" : "day")} />
          <Chip label={`Sort: ${SORTS.find((s) => s[0] === sort)![1]}`} onPress={() => setSort(SORTS[(SORTS.findIndex((s) => s[0] === sort) + 1) % SORTS.length]![0])} />
          <Chip label={showFilters ? "Fewer filters" : "More filters"} onPress={() => setShowFilters(!showFilters)} />
        </ScrollView>

        {showFilters ? (
          <View style={{ gap: 10, marginTop: 12 }}>
            <HRow>
              <T size={13} dim style={{ width: 72 }}>Rating</T>
              {([["fire", "Winner"], ["good", "Good"], ["meh", "Meh"]] as const).map(([k, l]) => <Chip key={k} label={l} active={rating === k} onPress={() => setRating(rating === k ? null : k)} />)}
            </HRow>
            <HRow>
              <T size={13} dim style={{ width: 72 }}>Logged by</T>
              {[...people.entries()].map(([id, p]) => <Chip key={id} label={p.name} active={who === id} onPress={() => setWho(who === id ? null : id)} />)}
            </HRow>
            {allTags.length ? (
              <HRow>
                <T size={13} dim style={{ width: 72 }}>Tag</T>
                {allTags.map((t) => <Chip key={t} label={`#${t}`} active={tag === t} onPress={() => setTag(tag === t ? null : t)} />)}
              </HRow>
            ) : null}
          </View>
        ) : null}

        {filtered ? (
          <HRow style={{ marginTop: 12 }}>
            <T dim size={14}>{rows.length} of {finds.length} entries</T>
            <Pressable onPress={clear}><T size={14} style={{ textDecorationLine: "underline" }}>Clear</T></Pressable>
          </HRow>
        ) : null}

        {groups.length === 0 ? (
          <Empty text={filtered ? "Nothing matches. Try clearing filters." : "No entries yet. Tap + to log your first product."} />
        ) : groups.map(([key, list]) => (
          <View key={key} style={{ marginTop: 22 }}>
            <T size={14} bold style={{ color: C.dim, marginBottom: 10 }}>{view === "day" ? dayLabel(key) : key} · {list.length}</T>
            {wide ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8 }}>
                {list.map((f) => (
                  <View key={f.id} style={{ width: `${100 / cols}%`, paddingHorizontal: 8, marginBottom: 16 }}>
                    <EntryTile f={f} person={people.get(f.captured_by)?.name} notes={noteCount.get(f.id) ?? 0} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={st.list}>
                {list.map((f, i) => (
                  <View key={f.id} style={i > 0 ? st.divider : undefined}>
                    <EntryRow f={f} person={people.get(f.captured_by)?.name} notes={noteCount.get(f.id) ?? 0} />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </Screen>
      {!wide ? <Fab onPress={() => router.push("/new")} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  list: { backgroundColor: C.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: "hidden" },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14 },
  tile: { backgroundColor: C.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: "hidden" },
  pressed: { backgroundColor: "#FAFAF9" },
});
