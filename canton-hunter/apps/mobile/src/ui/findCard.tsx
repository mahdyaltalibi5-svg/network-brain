import { Image } from "expo-image";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { findTitle, formatMoney, GUT_EMOJI, mediaFor, useMediaSource } from "@/lib/data";
import { all, get, type Row } from "@/lib/store";
import { C, T } from "./kit";

export function Thumb({ findId, size = 64 }: { findId: string; size?: number }) {
  const m = mediaFor(findId, "product_photo")[0];
  const src = useMediaSource(m);
  return src
    ? <Image source={src} style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.card2 }} contentFit="cover" cachePolicy="disk" />
    : <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.card2 }} />;
}

const STAGE_LABEL = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** One find as a quiet list row: photo, title, where, terms. Score on the right. */
export function FindCard({ f, person, score, right }: { f: Row; person?: { name: string; color: string }; score?: Row; right?: ReactNode }) {
  const uploading = mediaFor(f.id).some((m) => m.upload_state !== "uploaded");
  const sup = get("suppliers", f.supplier_id);
  const booths = f.product_group_id ? all("finds").filter((x) => x.product_group_id === f.product_group_id).length : 1;
  const where = [f.hall && `Hall ${f.hall}`, sup?.name_en ?? sup?.name_cn].filter(Boolean).join(" · ");
  const terms = [
    f.fob_price_cents != null ? `${formatMoney(f.fob_price_cents, f.fob_currency ?? "USD")} · MOQ ${f.moq ?? "?"}` : null,
    f.gut ? GUT_EMOJI[f.gut] : null,
    person?.name,
  ].filter(Boolean).join(" · ");
  const flags = [
    f.stage !== "found" ? STAGE_LABEL(f.stage) : null,
    booths > 1 ? `${booths} booths` : null,
    f.hunt_item_id ? "On hunt list" : null,
    uploading ? "Uploading" : null,
  ].filter(Boolean).join(" · ");
  const gated = !!score?.gates_failed?.length;
  return (
    <Pressable onPress={() => router.push(`/find/${f.id}`)} style={({ pressed }) => [st.row, pressed && { backgroundColor: "#FAFAF9" }]}>
      <Thumb findId={f.id} />
      <View style={{ flex: 1, gap: 3 }}>
        <T size={16} bold numberOfLines={1}>{findTitle(f)}</T>
        {where ? <T dim size={14} numberOfLines={1}>{where}</T> : null}
        {terms ? <T dim size={14} numberOfLines={1}>{terms}</T> : null}
        {flags ? <T size={13} numberOfLines={1} style={{ color: C.text, marginTop: 1 }}>{flags}</T> : null}
        {f.processing_state === "error" ? <T size={13} style={{ color: C.bad }}>AI couldn't process this — open to retry</T> : null}
      </View>
      {right ?? (score ? (
        <View style={{ alignItems: "flex-end" }}>
          <T size={20} bold style={{ color: gated ? C.bad : C.text }}>{Math.round(score.total)}</T>
          <T size={11} dim>score</T>
        </View>
      ) : null)}
    </Pressable>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: C.card, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
});
