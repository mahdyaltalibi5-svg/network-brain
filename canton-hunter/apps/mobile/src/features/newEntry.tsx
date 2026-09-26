/**
 * NEW ENTRY: a simple form. Photo fields open the camera. Only a product photo is required; everything else is
 * optional (the AI reads the business card and fills gaps later). The half-filled form is saved as a draft,
 * so closing the app loses nothing. Saving is local and instant; syncing happens in the background.
 */
import { parseBoothCode, uuidv7 } from "@canton/core";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { batch, insert, kvGet, kvSet, myId } from "@/lib/store";
import { syncSoon } from "@/lib/sync";
import { pickPhoto, takePhoto, type PickedPhoto } from "@/lib/photoPicker";
import { copyFile, keepFile, registerFile, resizeSoon, runUploads } from "@/lib/upload";
import { TagEditor } from "./entryExtras";
import { Button, C, Chip, Field, PageHeader, Row, Screen, T } from "@/ui/kit";

interface Shot { id: string; uri: string; mime: string }
interface Form {
  products: Shot[];
  cards: Shot[];
  name: string;
  price: string;
  currency: "USD" | "CNY";
  moq: string;
  lead: string;
  booth: string;
  supplier: string;
  notes: string;
  rating: "fire" | "good" | "meh" | null;
  tags: string[];
}
interface LastBooth { booth: string; supplier: string; cards: Shot[]; currency: "USD" | "CNY" }
const EMPTY: Form = { products: [], cards: [], name: "", price: "", currency: "USD", moq: "", lead: "", booth: "", supplier: "", notes: "", rating: null, tags: [] };
const num = (s: string) => { const n = Number(s.replace(/[^\d.]/g, "")); return s.trim() === "" || !Number.isFinite(n) ? null : n; };

function PhotoField({ label, hint, shots, onAdd, onRemove, max }: {
  label: string; hint: string; shots: Shot[]; onAdd: (p: PickedPhoto) => void; onRemove: (id: string) => void; max: number;
}) {
  async function add(fromCamera: boolean) {
    const p = fromCamera ? await takePhoto() : await pickPhoto();
    if (p) onAdd(p);
  }
  return (
    <View style={{ marginBottom: 20 }}>
      <T size={15} bold>{label}</T>
      <T size={13} dim style={{ marginBottom: 10 }}>{hint}</T>
      <Row gap={10}>
        {shots.map((s) => (
          <Pressable key={s.id} onPress={() => onRemove(s.id)}>
            <Image source={{ uri: s.uri }} style={st.thumb} contentFit="cover" />
            <T size={11} dim style={{ textAlign: "center", marginTop: 4 }}>Remove</T>
          </Pressable>
        ))}
        {shots.length < max ? (
          <View style={{ gap: 8 }}>
            <Pressable onPress={() => add(true)} style={({ pressed }) => [st.addTile, pressed && { opacity: 0.7 }]}>
              <T size={26} style={{ color: C.dim }}>+</T>
              <T size={13} dim>Take photo</T>
            </Pressable>
            <Pressable onPress={() => add(false)}><T size={13} dim style={{ textAlign: "center", textDecorationLine: "underline" }}>or choose one</T></Pressable>
          </View>
        ) : null}
      </Row>
    </View>
  );
}

export function NewEntryScreen() {
  const [form, setFormState] = useState<Form>(() => ({ ...EMPTY, ...(kvGet<Form>("entryDraft") ?? {}) }));
  const last = kvGet<LastBooth>("lastEntryBooth");
  const [savedCount, setSavedCount] = useState(0);
  const set = (p: Partial<Form>) => setFormState((f) => { const n = { ...f, ...p }; kvSet("entryDraft", n); return n; });

  function addShot(kind: "products" | "cards", p: PickedPhoto) {
    const id = uuidv7();
    const uri = keepFile(p.uri, id, "image/jpeg");
    set({ [kind]: [...form[kind], { id, uri, mime: "image/jpeg" }] } as Partial<Form>);
  }

  function save(another = false) {
    if (!form.products.length) {
      Alert.alert("Add a product photo", "A photo is the only thing required. Everything else is optional.");
      return;
    }
    const me = myId();
    const boothParsed = parseBoothCode(form.booth || form.notes);
    const price = num(form.price);
    const hall = boothParsed?.hall ?? kvGet<string>("hall");
    batch(() => {
      const f = insert("finds", {
        captured_by: me, captured_at: new Date().toISOString(), hall, booth_code: boothParsed?.booth ?? (form.booth.trim() || null),
        title_override: form.name.trim() || null, transcript: [form.supplier && `Supplier: ${form.supplier}`, form.notes].filter(Boolean).join("\n") || null,
        fob_price_cents: price == null ? null : Math.round(price * 100), fob_currency: price == null ? null : form.currency,
        moq: num(form.moq), lead_time_days: num(form.lead), gut: form.rating, tags_user: form.tags, starred: false,
        tags_ai: [], certifications: [], processing_state: "pending", stage: "found",
      });
      const add = (s: Shot, kind: string) => {
        insert("media", { id: s.id, find_id: f.id, kind, upload_state: "pending", mime: s.mime });
        registerFile(s.id, s.uri, s.mime, kind);
      };
      form.products.forEach((s) => add(s, "product_photo"));
      form.cards.forEach((s) => add(s, "card_photo"));
      if (hall) kvSet("hall", hall);
      kvSet("lastEntryBooth", { booth: form.booth, supplier: form.supplier, cards: form.cards, currency: form.currency } satisfies LastBooth);
      kvSet("entryDraft", null);
    });
    [...form.products, ...form.cards].forEach((s) => resizeSoon(s.id));
    syncSoon(1500);
    setTimeout(() => void runUploads(), 2500);
    if (another) {
      // same booth: keep booth, supplier, card, currency; clear the product
      const next: Form = { ...EMPTY, booth: form.booth, supplier: form.supplier, cards: copyCards(form.cards), currency: form.currency };
      setFormState(next);
      kvSet("entryDraft", next);
      setSavedCount((n) => n + 1);
      return;
    }
    setFormState(EMPTY);
    if (router.canGoBack()) router.back(); else router.replace("/");
  }

  /** Cards are reused for the next entry: give them new media ids (each entry owns its own media rows). */
  function copyCards(cards: Shot[]): Shot[] {
    return cards.map((c) => { const id = uuidv7(); return { id, uri: copyFile(c.uri, id, c.mime), mime: c.mime }; });
  }

  function sameBoothAsLast() {
    if (!last) return;
    set({ booth: last.booth, supplier: last.supplier, cards: copyCards(last.cards), currency: last.currency });
  }

  function discard() {
    const clear = () => { kvSet("entryDraft", null); setFormState(EMPTY); router.canGoBack() ? router.back() : router.replace("/"); };
    if (form === EMPTY || (!form.products.length && !form.name && !form.notes)) return clear();
    Alert.alert("Discard this entry?", undefined, [{ text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: clear }]);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen narrow>
        <PageHeader title="New entry" back="Journal" subtitle="Only the product photo is required. The AI reads the business card and fills in the rest." />
        {savedCount ? <View style={st.saved}><T size={14}>Saved {savedCount} from this booth. Add the next product.</T></View> : null}
        {last && !form.cards.length && !form.booth ? (
          <Pressable onPress={sameBoothAsLast} style={st.same}>
            <T size={15} bold>Same booth as last entry</T>
            <T size={13} dim>{[last.booth, last.supplier, last.cards.length ? "card photo" : null].filter(Boolean).join(" · ") || "Reuse booth and card"}</T>
          </Pressable>
        ) : null}

        <PhotoField label="Product photos" hint="Up to 4. Show it clearly, packaging too if you can." max={4}
          shots={form.products} onAdd={(p) => addShot("products", p)} onRemove={(id) => set({ products: form.products.filter((x) => x.id !== id) })} />
        <PhotoField label="Business card" hint="Front and back if there's Chinese on one side." max={2}
          shots={form.cards} onAdd={(p) => addShot("cards", p)} onRemove={(id) => set({ cards: form.cards.filter((x) => x.id !== id) })} />

        <Field label="Product name" placeholder="e.g. LED sunset lamp" value={form.name} onChangeText={(v) => set({ name: v })} />
        <Row gap={10} style={{ flexWrap: "nowrap" }}>
          <View style={{ flex: 1 }}><Field label="Price (FOB)" placeholder="2.10" keyboardType="decimal-pad" value={form.price} onChangeText={(v) => set({ price: v })} /></View>
          <View style={{ paddingTop: 22, flexDirection: "row", gap: 6 }}>
            <Chip label="USD" active={form.currency === "USD"} onPress={() => set({ currency: "USD" })} />
            <Chip label="RMB" active={form.currency === "CNY"} onPress={() => set({ currency: "CNY" })} />
          </View>
        </Row>
        <Row gap={10} style={{ flexWrap: "nowrap" }}>
          <View style={{ flex: 1 }}><Field label="MOQ" placeholder="500" keyboardType="number-pad" value={form.moq} onChangeText={(v) => set({ moq: v })} /></View>
          <View style={{ flex: 1 }}><Field label="Lead time (days)" placeholder="20" keyboardType="number-pad" value={form.lead} onChangeText={(v) => set({ lead: v })} /></View>
        </Row>
        <Row gap={10} style={{ flexWrap: "nowrap" }}>
          <View style={{ flex: 1 }}><Field label="Booth" placeholder="11.2A15" autoCapitalize="characters" value={form.booth} onChangeText={(v) => set({ booth: v })} /></View>
          <View style={{ flex: 1 }}><Field label="Supplier" placeholder="Optional" value={form.supplier} onChangeText={(v) => set({ supplier: v })} /></View>
        </Row>
        <Field label="Notes" multiline placeholder="Anything they said: logo, packaging, samples, factory or trader… (tap the mic on your keyboard to dictate)"
          value={form.notes} onChangeText={(v) => set({ notes: v })} />

        <T size={13} dim style={{ marginBottom: 6 }}>Tags</T>
        <View style={{ marginBottom: 16 }}><TagEditor value={form.tags} onChange={(tags) => set({ tags })} /></View>

        <T size={13} dim style={{ marginBottom: 6 }}>How good is it?</T>
        <Row style={{ marginBottom: 28 }}>
          {([["fire", "Winner"], ["good", "Good"], ["meh", "Meh"]] as const).map(([k, l]) => (
            <Chip key={k} label={l} active={form.rating === k} onPress={() => set({ rating: form.rating === k ? null : k })} />
          ))}
        </Row>

        <Button title="Save entry" onPress={() => save(false)} big />
        <Button title="Save & add another from this booth" kind="secondary" onPress={() => save(true)} style={{ marginTop: 10 }} />
        <Button title="Discard" kind="ghost" onPress={discard} style={{ marginTop: 8 }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  saved: { backgroundColor: C.goodBg, borderRadius: 12, padding: 12, marginBottom: 16 },
  same: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, gap: 2 },
  thumb: { width: 92, height: 92, borderRadius: 12, backgroundColor: C.card2 },
  addTile: { width: 92, height: 92, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#C9C5C0", backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
});
