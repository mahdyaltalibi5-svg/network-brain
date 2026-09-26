/** Same product, different booths: every quote side by side with its real landed margin. */
import { scoreFind, toUsd, uuidv7 } from "@canton/core";
import { router } from "expo-router";
import { View } from "react-native";
import { findTitle, formatMoney, useConfig } from "@/lib/data";
import { all, get, patch, useTable, type Row } from "@/lib/store";
import { Thumb } from "@/ui/findCard";
import { Badge, Button, C, Card, Row as HRow, Section, T } from "@/ui/kit";

export function groupMembers(f: Row): Row[] {
  if (!f.product_group_id) return [f];
  return all("finds").filter((x) => x.product_group_id === f.product_group_id);
}

export function CompareSection({ f }: { f: Row }) {
  useTable("finds"); useTable("research"); useTable("votes"); useTable("cost_calcs");
  const cfg = useConfig();
  const members = groupMembers(f);
  if (members.length < 2) return null;

  const rows = members.map((m) => {
    const research = all("research").find((r) => r.find_id === m.id);
    const votes = all("votes").filter((v) => v.find_id === m.id).map((v) => v.value as number);
    const calc = all("cost_calcs").find((c) => c.find_id === m.id);
    const s = scoreFind(m as never, research as never, votes, cfg, (calc?.inputs ?? {}) as never);
    const fobUsd = m.fob_price_cents != null ? toUsd(m.fob_price_cents / 100, m.fob_currency, cfg.cost) : null;
    return { m, s, fobUsd, supplier: get("suppliers", m.supplier_id) };
  }).sort((a, b) => (a.fobUsd ?? 1e9) - (b.fobUsd ?? 1e9));

  const priced = rows.filter((r) => r.fobUsd != null);
  const best = priced[0];
  const bestMargin = [...rows].filter((r) => r.s.cost).sort((a, b) => b.s.cost!.gross_margin_usd - a.s.cost!.gross_margin_usd)[0];

  return (
    <Section title={`Same product at ${members.length} booths`}>
      {best && priced.length > 1 ? (
        <Card style={{ borderColor: C.good }}>
          <T size={14}>💡 Lowest quote: <T bold>{formatMoney(Math.round(best.fobUsd! * 100))}</T> at {best.supplier?.name_en ?? best.supplier?.booth_code ?? "a booth"} (MOQ {best.m.moq ?? "?"}).
            {best.m.id !== f.id && f.fob_price_cents != null ? " Use it to negotiate." : ""}</T>
        </Card>
      ) : null}
      {rows.map(({ m, s, fobUsd, supplier }) => (
        <Card key={m.id} onPress={m.id === f.id ? undefined : () => router.push(`/find/${m.id}`)} style={[{ flexDirection: "row", gap: 10 }, m.id === f.id && { borderColor: C.accent }]}>
          <Thumb findId={m.id} size={52} />
          <View style={{ flex: 1 }}>
            <T bold size={14} numberOfLines={1}>{supplier?.name_en ?? supplier?.name_cn ?? findTitle(m)}</T>
            <T dim size={12}>{[supplier?.hall && `Hall ${supplier.hall}`, m.booth_code ?? supplier?.booth_code, supplier && (supplier.is_factory_override ?? supplier.is_factory_ai) === true ? "factory" : null].filter(Boolean).join(" · ")}</T>
            <HRow gap={6} style={{ marginTop: 4 }}>
              <Badge label={fobUsd != null ? `$${fobUsd.toFixed(2)}` : "no price"} color={best && m.id === best.m.id ? "#1d5c43" : C.card2} />
              <Badge label={`MOQ ${m.moq ?? "?"}`} />
              {m.lead_time_days ? <Badge label={`${m.lead_time_days}d`} /> : null}
              {s.cost ? <Badge label={`${s.cost.margin_multiple.toFixed(1)}×`} color={bestMargin && m.id === bestMargin.m.id ? "#1d5c43" : C.card2} /> : null}
              {m.oem_logo ? <Badge label="logo ✓" /> : null}
            </HRow>
          </View>
        </Card>
      ))}
      <Button title="This one is a different product" kind="ghost" onPress={() => patch("finds", f.id, { product_group_id: uuidv7() })} />
    </Section>
  );
}
