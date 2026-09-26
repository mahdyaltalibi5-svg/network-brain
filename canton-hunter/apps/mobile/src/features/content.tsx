import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
import { Alert, Linking } from "react-native";
import { findTitle } from "@/lib/data";
import { saveToPhotos } from "@/lib/saveMedia";
import { all, patch, useTable } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Button, C, Card, Chip, Empty, Field, Row, Screen, Section, T } from "@/ui/kit";

export function ContentScreen() {
  const items = useTable("content_items");
  const media = useTable("media");
  const [busy, setBusy] = useState(false);
  const byDate = useMemo(() => {
    const m = new Map<string, typeof items>();
    for (const i of [...items].sort((a, b) => (a.post_order ?? 0) - (b.post_order ?? 0))) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return [...m.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [items]);

  async function generate() {
    setBusy(true);
    const date = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
    const { error } = await supabase.rpc("request_job", { p_type: "content_pack", p_payload: { date } });
    setBusy(false);
    Alert.alert(error ? "Needs internet" : "Generating", error?.message ?? "You'll get a notification when it's ready (about a minute).");
  }

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}>
        <T size={26} bold>Content</T>
        <Button title="Make today's pack" onPress={generate} busy={busy} kind="secondary" />
      </Row>
      <T dim style={{ marginTop: 6 }}>Made nightly at 10pm China time from the day's best videos. Post by hand: save → CapCut → TikTok.</T>
      {byDate.length === 0 ? <Empty text="No content yet. Record 🎥 videos while capturing." /> : null}
      {byDate.map(([date, list]) => (
        <Section key={date} title={date}>
          {list.map((i) => {
            const m = media.find((x) => x.id === i.media_id);
            const f = m ? all("finds").find((x) => x.id === m.find_id) : undefined;
            const caption = [i.caption, (i.hashtags ?? []).map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ")].filter(Boolean).join("\n\n");
            if (i.kind === "recap") {
              return (
                <Card key={i.id}>
                  <T bold>🎙️ Day recap script</T>
                  <T selectable style={{ marginTop: 6 }}>{i.script}</T>
                  <Button title="Copy script" kind="secondary" onPress={() => { void Clipboard.setStringAsync(i.script ?? ""); }} style={{ marginTop: 8 }} />
                </Card>
              );
            }
            return (
              <Card key={i.id} style={i.posted ? { opacity: 0.55 } : undefined}>
                <T bold>#{i.post_order} · {f ? findTitle(f) : "Clip"}</T>
                {(i.hooks ?? []).map((h: string, k: number) => <T key={k} style={{ marginTop: 4 }}>🪝 {h}</T>)}
                {i.on_screen_text ? <T dim size={13} style={{ marginTop: 6 }}>On screen: {i.on_screen_text}</T> : null}
                <T selectable size={14} style={{ marginTop: 6, color: C.dim }}>{caption}</T>
                <Row style={{ marginTop: 10 }}>
                  <Button title="⬇︎ Save video" kind="secondary" onPress={() => m && saveToPhotos(m.id, m.storage_path).catch((e) => Alert.alert("Couldn't save", String(e.message ?? e)))} />
                  <Button title="Copy caption" kind="secondary" onPress={() => { void Clipboard.setStringAsync(caption); }} />
                  <Button title="TikTok" kind="ghost" onPress={() => Linking.openURL("snssdk1233://").catch(() => Linking.openURL("https://www.tiktok.com/upload"))} />
                </Row>
                <Row style={{ marginTop: 8 }}>
                  <Chip label={i.posted ? "Posted ✓" : "Mark posted"} active={i.posted} color={C.good} onPress={() => patch("content_items", i.id, { posted: !i.posted })} />
                </Row>
                {i.posted ? <Field placeholder="Post URL" defaultValue={i.posted_url ?? ""} onEndEditing={(e) => patch("content_items", i.id, { posted_url: e.nativeEvent.text || null })} /> : null}
              </Card>
            );
          })}
        </Section>
      ))}
    </Screen>
  );
}
