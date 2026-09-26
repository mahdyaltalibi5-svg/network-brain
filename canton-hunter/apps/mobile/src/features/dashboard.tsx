/** Trip dashboard: how the hunt is going. Stat tiles + single-hue bars with direct labels (one series each, no legend). */
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { fairDay, findTitle, usePeople } from "@/lib/data";
import { useTable, type Row } from "@/lib/store";
import { C, Card, Row as HRow, Screen, Section, T, PageHeader } from "@/ui/kit";

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
      <T dim size={13}>{label}</T>
      <T bold size={30}>{value}</T>
      {sub ? <T dim size={12}>{sub}</T> : null}
    </View>
  );
}

/** Horizontal bars: one hue, thin, rounded data end, value label in text ink. */
function Bars({ rows, dot }: { rows: { label: string; value: number; color?: string }[]; dot?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 }}>
          <View style={{ width: 96, flexDirection: "row", alignItems: "center", gap: 6 }}>
            {dot && r.color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color }} /> : null}
            <T size={13} numberOfLines={1} style={{ flexShrink: 1 }}>{r.label}</T>
          </View>
          <View style={{ flex: 1, height: 12, justifyContent: "center" }}>
            <View style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, height: 8, backgroundColor: C.text, opacity: 0.85, borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />
          </View>
          <T size={13} bold style={{ width: 36, textAlign: "right" }}>{r.value}</T>
        </View>
      ))}
    </Card>
  );
}

export function DashboardScreen() {
  const finds = useTable("finds");
  const suppliers = useTable("suppliers");
  const samples = useTable("samples");
  const launches = useTable("launches");
  const metrics = useTable("launch_metrics");
  const followups = useTable("followups");
  const scores = useTable("scores");
  const people = usePeople();

  const d = useMemo(() => {
    const byDay = new Map<string, number>();
    const byPerson = new Map<string, number>();
    const byHall = new Map<string, number>();
    const byStage = new Map<string, number>();
    for (const f of finds) {
      const day = fairDay(f.captured_at);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      if (f.captured_by) byPerson.set(f.captured_by, (byPerson.get(f.captured_by) ?? 0) + 1);
      if (f.hall) byHall.set(f.hall, (byHall.get(f.hall) ?? 0) + 1);
      byStage.set(f.stage, (byStage.get(f.stage) ?? 0) + 1);
    }
    const today = fairDay(new Date().toISOString());
    const scoreBy = new Map(scores.map((s) => [s.find_id, s]));
    const top = [...finds].filter((f) => scoreBy.has(f.id) && !scoreBy.get(f.id)!.gates_failed?.length)
      .sort((a, b) => scoreBy.get(b.id)!.total - scoreBy.get(a.id)!.total).slice(0, 5);
    const groups = new Set(finds.map((f) => f.product_group_id).filter(Boolean));
    return {
      today: byDay.get(today) ?? 0,
      fire: finds.filter((f) => f.gut === "fire").length,
      processed: finds.filter((f) => f.processing_state === "done").length,
      byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label: label.slice(5), value })),
      byPerson: [...byPerson.entries()].sort(([, a], [, b]) => b - a).map(([id, value]) => ({ label: people.get(id)?.name ?? "?", value, color: people.get(id)?.color })),
      byHall: [...byHall.entries()].sort(([, a], [, b]) => b - a).slice(0, 10).map(([label, value]) => ({ label: `Hall ${label}`, value })),
      pipeline: ["shortlisted", "quote_requested", "quote_received", "sample_requested", "sample_in_hand", "testing", "negotiating", "vetting", "ordered"]
        .map((s) => ({ label: s.replace(/_/g, " "), value: byStage.get(s) ?? 0 })).filter((r) => r.value > 0),
      top, scoreBy, products: groups.size,
      samplesPaid: samples.reduce((a, s: Row) => a + (s.paid_cents ?? 0), 0),
      adSpend: metrics.reduce((a, m: Row) => a + (m.spend_cents ?? 0), 0),
      live: launches.filter((l) => l.status === "live").length,
      sent: followups.filter((f) => f.status === "sent" || f.status === "replied").length,
      replied: followups.filter((f) => f.status === "replied").length,
    };
  }, [finds, samples, launches, metrics, followups, scores, people]);

  return (
    <Screen>
      <PageHeader title="Trip stats" back="Tools" />
      <HRow gap={10}>
        <Tile label="Finds" value={finds.length} sub={`${d.today} today · ${d.products} distinct products`} />
        <Tile label="Winners" value={d.fire} sub={`${d.processed} processed by AI`} />
        <Tile label="Suppliers" value={suppliers.filter((s) => !s.merged_into_id).length} sub={`${d.sent} followed up · ${d.replied} replied`} />
        <Tile label="Money out" value={`$${Math.round((d.samplesPaid + d.adSpend) / 100)}`} sub={`samples $${Math.round(d.samplesPaid / 100)} · ads $${Math.round(d.adSpend / 100)} · ${d.live} live`} />
      </HRow>

      {d.top.length ? (
        <Section title="Top 5 right now">
          {d.top.map((f, i) => (
            <Card key={f.id} onPress={() => router.push(`/find/${f.id}`)} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T style={{ flex: 1 }} numberOfLines={1}>{i + 1}. {findTitle(f)}</T>
              <T bold>{Math.round(d.scoreBy.get(f.id)!.total)}</T>
            </Card>
          ))}
        </Section>
      ) : null}

      {d.byPerson.length ? <Section title="Finds by person"><Bars rows={d.byPerson} dot /></Section> : null}
      {d.byDay.length ? <Section title="Finds by day"><Bars rows={d.byDay} /></Section> : null}
      {d.byHall.length ? <Section title="Busiest halls"><Bars rows={d.byHall} /></Section> : null}
      {d.pipeline.length ? <Section title="Pipeline"><Bars rows={d.pipeline} /></Section> : null}
    </Screen>
  );
}
