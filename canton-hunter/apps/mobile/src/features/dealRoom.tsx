import { STAGES } from "@canton/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { fairDay, usePeople } from "@/lib/data";
import { myId, useTable, type Row } from "@/lib/store";
import { FindCard } from "@/ui/findCard";
import { Badge, Button, C, Chip, Empty, Row as HRow, Screen, Section, T } from "@/ui/kit";

type Tab = "ranked" | "pipeline";

export function DealRoomScreen() {
  const finds = useTable("finds");
  const scores = useTable("scores");
  const votes = useTable("votes");
  const people = usePeople();
  const [tab, setTab] = useState<Tab>("ranked");
  const [day, setDay] = useState<string | null>(null);
  const [showGated, setShowGated] = useState(false);

  const scoreBy = useMemo(() => new Map(scores.map((s) => [s.find_id, s])), [scores]);
  const days = useMemo(() => [...new Set(finds.map((f) => fairDay(f.captured_at)))].sort().reverse(), [finds]);
  const toReview = useMemo(() => {
    const since = Date.now() - 36 * 3600_000;
    const mine = new Set(votes.filter((v) => v.user_id === myId()).map((v) => v.find_id));
    return finds.filter((f) => Date.parse(f.captured_at) > since && !mine.has(f.id) && (f.gut !== "meh" || (scoreBy.get(f.id)?.total ?? 0) >= 50)).length;
  }, [finds, votes, scoreBy]);

  const ranked = useMemo(() => finds
    .filter((f) => f.stage !== "killed" && (!day || fairDay(f.captured_at) === day))
    .filter((f) => showGated || !(scoreBy.get(f.id)?.gates_failed?.length))
    .sort((a, b) => (scoreBy.get(b.id)?.rank_key ?? -2000) - (scoreBy.get(a.id)?.rank_key ?? -2000)), [finds, scoreBy, day, showGated]);

  const byStage = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const f of finds) if (f.stage !== "found") m.set(f.stage, [...(m.get(f.stage) ?? []), f]);
    return m;
  }, [finds]);

  const voteDots = (id: string) => votes.filter((v) => v.find_id === id).map((v) => (v.value === 2 ? "🔥" : v.value === 1 ? "👍" : v.value === -1 ? "✕" : "·")).join("");

  return (
    <Screen>
      <HRow style={{ justifyContent: "space-between" }}>
        <T size={26} bold>Deal Room</T>
        <Button title={`Nightly review${toReview ? ` (${toReview})` : ""}`} onPress={() => router.push("/review")} kind={toReview ? "primary" : "secondary"} />
      </HRow>
      <HRow style={{ marginVertical: 12 }}>
        <Chip label="Ranked" active={tab === "ranked"} onPress={() => setTab("ranked")} />
        <Chip label="Pipeline" active={tab === "pipeline"} onPress={() => setTab("pipeline")} />
      </HRow>
      {tab === "ranked" ? (
        <>
          <HRow style={{ marginBottom: 10 }}>
            <Chip label="All days" active={!day} onPress={() => setDay(null)} />
            {days.slice(0, 7).map((d) => <Chip key={d} label={d.slice(5)} active={day === d} onPress={() => setDay(d)} />)}
            <Chip label={showGated ? "Showing failed gates" : "Hide failed gates"} active={showGated} onPress={() => setShowGated(!showGated)} color={C.bad} />
          </HRow>
          {ranked.length === 0 ? <Empty text="Nothing scored yet." /> : null}
          {ranked.map((f, i) => {
            const s = scoreBy.get(f.id);
            return (
              <FindCard key={f.id} f={f} person={people.get(f.captured_by)} score={s} right={
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <T bold size={18}>#{i + 1}</T>
                  {s?.margin_multiple != null ? <Badge label={`${Number(s.margin_multiple).toFixed(1)}×`} color={s.margin_multiple >= 3 ? "#1d5c43" : "#5c1d2b"} /> : null}
                  {s?.arrive_by ? <T size={12} dim>🎄 {String(s.arrive_by).slice(5)}</T> : null}
                  <T size={12}>{voteDots(f.id)}</T>
                </View>
              } />
            );
          })}
        </>
      ) : (
        STAGES.filter((st) => st !== "found").map((st) => {
          const rows = byStage.get(st) ?? [];
          if (!rows.length) return null;
          return (
            <Section key={st} title={`${st.replace(/_/g, " ")} (${rows.length})`}>
              {rows.map((f) => <FindCard key={f.id} f={f} person={people.get(f.captured_by)} score={scoreBy.get(f.id)} />)}
            </Section>
          );
        })
      )}
      {tab === "pipeline" && byStage.size === 0 ? <Empty text="Move finds to Shortlisted to start the pipeline." /> : null}
    </Screen>
  );
}
