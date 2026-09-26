import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { launchCameraAsync } from "@/lib/photoPicker";
import { useMemo, useState } from "react";
import { Alert, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fairDay, usePeople } from "@/lib/data";
import { myId, searchFinds, useTable } from "@/lib/store";
import { api } from "@/lib/supabase";
import { syncNow, useSyncStatus } from "@/lib/sync";
import { FindCard } from "@/ui/findCard";
import { Button, C, Chip, Empty, Field, Row, T } from "@/ui/kit";

type Filter = "today" | "mine" | "fire" | "all";

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const finds = useTable("finds");
  const scores = useTable("scores");
  const people = usePeople();
  const sync = useSyncStatus();
  const [filter, setFilter] = useState<Filter>("today");
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const scoreBy = useMemo(() => new Map(scores.map((s) => [s.find_id, s])), [scores]);
  const list = useMemo(() => {
    let rows = [...finds];
    if (q.trim()) {
      const ids = searchFinds(q);
      const rank = new Map(ids.map((id, i) => [id, i]));
      rows = rows.filter((f) => rank.has(f.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
      return rows;
    }
    const today = fairDay(new Date().toISOString());
    if (filter === "today") rows = rows.filter((f) => fairDay(f.captured_at) === today);
    if (filter === "mine") rows = rows.filter((f) => f.captured_by === myId());
    if (filter === "fire") rows = rows.filter((f) => f.gut === "fire");
    return rows.sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  }, [finds, filter, q]);

  async function searchByPhoto() {
    try {
      const pic = await launchCameraAsync();
      if (!pic) return;
      const ctx = ImageManipulator.manipulate(pic);
      ctx.resize({ width: 800 });
      const img = await (await ctx.renderAsync()).saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
      const r = await api<{ query: string }>({ action: "photo_query", image_base64: img.base64, media_type: "image/jpeg" });
      setQ(r.query);
    } catch (e) {
      Alert.alert("Photo search needs internet", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={list}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await syncNow(); setRefreshing(false); }}
        ListHeaderComponent={
          <View>
            <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <T size={30} bold style={{ fontWeight: "700" }}>Feed</T>
              <T dim size={13}>{sync.online ? "" : "Offline · "}{sync.pendingChanges + sync.pendingUploads ? `${sync.pendingChanges + sync.pendingUploads} to sync` : "Synced"}</T>
            </Row>
            <Row style={{ marginBottom: 6 }}>
              <View style={{ flex: 1 }}><Field placeholder="Search finds, suppliers, booths…" value={q} onChangeText={setQ} clearButtonMode="always" /></View>
              <Button title="Photo" kind="secondary" onPress={searchByPhoto} style={{ marginBottom: 12 }} />
            </Row>
            {!q ? (
              <Row style={{ marginBottom: 12 }}>
                {(["today", "mine", "fire", "all"] as Filter[]).map((k) => (
                  <Chip key={k} label={{ today: "Today", mine: "Mine", fire: "Winners", all: "All" }[k]} active={filter === k} onPress={() => setFilter(k)} />
                ))}
                <T dim size={13}>{list.length}</T>
              </Row>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Empty text={q ? "Nothing matches." : "No finds yet. Go capture something."} />}
        renderItem={({ item }) => <FindCard f={item} person={people.get(item.captured_by)} score={scoreBy.get(item.id)} />}
      />
    </View>
  );
}
