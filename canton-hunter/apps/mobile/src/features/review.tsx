import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, View } from "react-native";
import { findDescription, findTitle, formatMoney, mediaFor, useMediaSource, usePeople } from "@/lib/data";
import { all, insert, myId, patch, useTable, type Row } from "@/lib/store";
import { syncSoon } from "@/lib/sync";
import { Badge, Button, C, Row as HRow, Screen, T } from "@/ui/kit";

function Big({ f }: { f: Row }) {
  const src = useMediaSource(mediaFor(f.id, "product_photo")[0]);
  const w = Dimensions.get("window").width - 32;
  return src ? <Image source={src} style={{ width: w, height: w, borderRadius: 20 }} contentFit="cover" cachePolicy="disk" />
    : <View style={{ width: w, height: w, borderRadius: 20, backgroundColor: C.card2 }} />;
}

/** Nightly Review: swipe through the last day's finds and vote. 2+ "must test" votes auto-shortlist (server). */
export function ReviewScreen() {
  const finds = useTable("finds");
  const votes = useTable("votes");
  const scores = useTable("scores");
  const people = usePeople();
  const me = myId();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const queue = useMemo(() => {
    const since = Date.now() - 36 * 3600_000;
    const mine = new Set(votes.filter((v) => v.user_id === me).map((v) => v.find_id));
    const score = new Map(scores.map((s) => [s.find_id, s.total as number]));
    return finds
      .filter((f) => Date.parse(f.captured_at) > since && !mine.has(f.id) && !skipped.has(f.id) && (f.gut !== "meh" || (score.get(f.id) ?? 0) >= 50))
      .sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));
  }, [finds, votes, scores, skipped]);

  const f = queue[0];
  function vote(value: number) {
    if (!f) return;
    const existing = all("votes").find((v) => v.find_id === f.id && v.user_id === me);
    if (existing) patch("votes", existing.id, { value });
    else insert("votes", { find_id: f.id, user_id: me, value, comment: null });
    syncSoon(2000);
  }

  if (!f) {
    return (
      <Screen>
        <T size={22} bold>All caught up</T>
        <T dim style={{ marginVertical: 12 }}>Finds with 2+ “must test” votes move to Shortlisted automatically.</T>
        <Button title="Back to Deal Room" onPress={() => router.back()} />
      </Screen>
    );
  }
  const others = all("votes").filter((v) => v.find_id === f.id);
  const s = all("scores").find((x) => x.find_id === f.id);
  return (
    <Screen>
      <T dim style={{ marginBottom: 8 }}>{queue.length} left</T>
      <Big f={f} />
      <T size={22} bold style={{ marginTop: 12 }}>{findTitle(f)}</T>
      <T dim numberOfLines={3}>{findDescription(f)}</T>
      <HRow style={{ marginTop: 8 }}>
        {s ? <Badge label={`Score ${Math.round(s.total)}`} /> : null}
        {s?.margin_multiple ? <Badge label={`${Number(s.margin_multiple).toFixed(1)}× margin`} /> : null}
        {f.fob_price_cents != null ? <Badge label={`${formatMoney(f.fob_price_cents, f.fob_currency ?? "USD")} · MOQ ${f.moq ?? "?"}`} /> : null}
        <Badge label={`by ${people.get(f.captured_by)?.name ?? "?"}`} />
        {others.map((v) => <Badge key={v.id} label={`${people.get(v.user_id)?.name}: ${v.value === 2 ? "must test" : v.value === 1 ? "like" : "pass"}`} />)}
      </HRow>
      {f.transcript ? <T size={14} style={{ marginTop: 8, fontStyle: "italic" }} numberOfLines={3}>“{f.transcript}”</T> : null}
      <HRow style={{ marginTop: 18, justifyContent: "space-between" }} gap={8}>
        <Button title="Pass" kind="secondary" big style={{ flex: 1 }} onPress={() => vote(-1)} />
        <Button title="Like" kind="secondary" big style={{ flex: 1 }} onPress={() => vote(1)} />
        <Button title="Must test" big style={{ flex: 1 }} onPress={() => vote(2)} />
      </HRow>
      <HRow style={{ marginTop: 10 }}>
        <Button title="Skip" kind="ghost" onPress={() => setSkipped(new Set([...skipped, f.id]))} />
        <Button title="Details" kind="ghost" onPress={() => router.push(`/find/${f.id}`)} />
      </HRow>
    </Screen>
  );
}
