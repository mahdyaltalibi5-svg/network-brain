/** JOURNAL: every product logged at the fair, newest first, grouped by day. Search + one "+" to add. */
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { fairDay, findTitle, formatMoney, GUT_EMOJI, mediaFor, useMediaSource, usePeople } from "@/lib/data";
import { get, searchFinds, useTable, type Row } from "@/lib/store";
import { useSyncStatus } from "@/lib/sync";
import { Button, C, Chip, Empty, Fab, isWeb, PageHeader, Row as HRow, Screen, SearchBar, T, useWide } from "@/ui/kit";

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

function facts(f: Row, person?: string): { where: string; terms: string } {
  const s = get("suppliers", f.supplier_id);
  return {
    where: [f.booth_code ?? (f.hall ? `Hall ${f.hall}` : null), s?.name_en ?? s?.name_cn].filter(Boolean).join(" · "),
    terms: [f.fob_price_cents != null ? `${formatMoney(f.fob_price_cents, f.fob_currency ?? "USD")} · MOQ ${f.moq ?? "?"}` : null,
      f.gut ? GUT_EMOJI[f.gut] : null, person].filter(Boolean).join(" · "),
  };
}

function EntryRow({ f, person }: { f: Row; person?: string }) {
  const { where, terms } = facts(f, person);
  return (
    <Pressable onPress={() => router.push(`/find/${f.id}`)} style={({ pressed }) => [st.row, pressed && st.pressed]}>
      <Photo f={f} size={64} />
      <View style={{ flex: 1, gap: 3 }}>
        <T size={16} bold numberOfLines={1}>{findTitle(f)}</T>
        {where ? <T dim size={14} numberOfLines={1}>{where}</T> : null}
        {terms ? <T dim size={14} numberOfLines={1}>{terms}</T> : null}
      </View>
      <T size={12} dim>{new Date(f.captured_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</T>
    </Pressable>
  );
}

function EntryTile({ f, person }: { f: Row; person?: string }) {
  const { where, terms } = facts(f, person);
  return (
    <Pressable onPress={() => router.push(`/find/${f.id}`)} style={({ pressed }) => [st.tile, pressed && st.pressed]}>
      <Photo f={f} />
      <View style={{ padding: 14, gap: 3 }}>
        <T size={16} bold numberOfLines={1}>{findTitle(f)}</T>
        <T dim size={14} numberOfLines={1}>{where || " "}</T>
        <T dim size={14} numberOfLines={1}>{terms || " "}</T>
      </View>
    </Pressable>
  );
}

export function JournalScreen() {
  const finds = useTable("finds");
  useTable("media"); useTable("suppliers");
  const people = usePeople();
  const sync = useSyncStatus();
  const { wide, cols } = useWide();
  const [q, setQ] = useState("");
  const [winnersOnly, setWinnersOnly] = useState(false);

  const groups = useMemo(() => {
    let rows = [...finds];
    if (q.trim()) {
      const ids = new Set(searchFinds(q));
      rows = rows.filter((f) => ids.has(f.id));
    }
    if (winnersOnly) rows = rows.filter((f) => f.gut === "fire");
    rows.sort((a, b) => b.captured_at.localeCompare(a.captured_at));
    const m = new Map<string, Row[]>();
    for (const f of rows) {
      const d = fairDay(f.captured_at);
      m.set(d, [...(m.get(d) ?? []), f]);
    }
    return [...m.entries()];
  }, [finds, q, winnersOnly]);

  const total = groups.reduce((a, [, r]) => a + r.length, 0);
  const pending = sync.pendingChanges + sync.pendingUploads;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen>
        <PageHeader
          title="Journal"
          subtitle={`${finds.length} product${finds.length === 1 ? "" : "s"} logged${pending ? ` · ${pending} waiting to sync` : ""}`}
          right={
            <HRow>
              {!isWeb ? <Button title="Tools" kind="secondary" onPress={() => router.push("/tools")} /> : null}
              {wide && !isWeb ? <Button title="New entry" onPress={() => router.push("/new")} /> : null}
            </HRow>
          }
        />
        <SearchBar value={q} onChangeText={setQ} placeholder="Search products, suppliers, booths, notes…" />
        <HRow style={{ marginBottom: 8 }}>
          <Chip label="All" active={!winnersOnly} onPress={() => setWinnersOnly(false)} />
          <Chip label="Winners" active={winnersOnly} onPress={() => setWinnersOnly(true)} />
          {q ? <T dim size={14}>{total} result{total === 1 ? "" : "s"}</T> : null}
        </HRow>

        {groups.length === 0 ? (
          <Empty text={q ? "Nothing matches that search." : "No entries yet. Tap + to log your first product."} />
        ) : groups.map(([day, rows]) => (
          <View key={day} style={{ marginTop: 20 }}>
            <T size={14} bold style={{ color: C.dim, marginBottom: 10 }}>{dayLabel(day)} · {rows.length}</T>
            {wide ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8 }}>
                {rows.map((f) => (
                  <View key={f.id} style={{ width: `${100 / cols}%`, paddingHorizontal: 8, marginBottom: 16 }}>
                    <EntryTile f={f} person={people.get(f.captured_by)?.name} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={st.list}>
                {rows.map((f, i) => (
                  <View key={f.id} style={i > 0 ? st.divider : undefined}>
                    <EntryRow f={f} person={people.get(f.captured_by)?.name} />
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
