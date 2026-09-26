import { Image } from "expo-image";
import { router } from "expo-router";
import { View } from "react-native";
import { findTitle, formatMoney, GUT_EMOJI, mediaFor, useMediaSource } from "@/lib/data";
import { all, get, type Row } from "@/lib/store";
import { Badge, C, Card, Row as HRow, T } from "./kit";

export function Thumb({ findId, size = 72 }: { findId: string; size?: number }) {
  const m = mediaFor(findId, "product_photo")[0];
  const src = useMediaSource(m);
  return src
    ? <Image source={src} style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.card2 }} contentFit="cover" cachePolicy="disk" />
    : <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.card2 }} />;
}

export function FindCard({ f, person, score, right }: { f: Row; person?: { name: string; color: string }; score?: Row; right?: React.ReactNode }) {
  const uploading = mediaFor(f.id).some((m) => m.upload_state !== "uploaded");
  const sup = get("suppliers", f.supplier_id);
  const booths = f.product_group_id ? all("finds").filter((x) => x.product_group_id === f.product_group_id).length : 1;
  return (
    <Card onPress={() => router.push(`/find/${f.id}`)} style={{ flexDirection: "row", gap: 12 }}>
      <Thumb findId={f.id} />
      <View style={{ flex: 1, gap: 4 }}>
        <T bold numberOfLines={2}>{findTitle(f)}</T>
        <T dim size={13} numberOfLines={1}>
          {[f.hall && `Hall ${f.hall}`, f.booth_code, sup?.name_en ?? sup?.name_cn].filter(Boolean).join(" · ") || "—"}
        </T>
        <HRow gap={6}>
          {f.gut ? <T size={14}>{GUT_EMOJI[f.gut]}</T> : null}
          {f.fob_price_cents != null ? <Badge label={`${formatMoney(f.fob_price_cents, f.fob_currency ?? "USD")} · MOQ ${f.moq ?? "?"}`} /> : null}
          {score ? <Badge label={`★ ${Math.round(score.total)}`} color={score.gates_failed?.length ? C.bad : C.accent} /> : null}
          {f.hunt_item_id ? <Badge label="🎯" /> : null}
          {booths > 1 ? <Badge label={`×${booths} booths`} color={C.blue} /> : null}
          {f.stage !== "found" ? <Badge label={f.stage.replace(/_/g, " ")} color={C.blue} /> : null}
          {uploading ? <Badge label="⬆︎ waiting" color={C.card2} /> : null}
          {f.processing_state === "error" ? <Badge label="AI failed" color={C.bad} /> : null}
          {person ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: person.color }} /> : null}
          {person ? <T dim size={12}>{person.name}</T> : null}
        </HRow>
      </View>
      {right}
    </Card>
  );
}
