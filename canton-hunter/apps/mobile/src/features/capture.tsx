/**
 * CAPTURE: the 30-second flow. Product photo → business card (QR auto-scanned) → optional video / voice → gut.
 * Every shutter tap moves the file into permanent storage immediately and the draft is saved to SQLite,
 * so killing the app mid-capture loses nothing. Saving is a local transaction; uploads happen later.
 */
import { uuidv7, parseBoothCode } from "@canton/core";
import { CameraView, useCameraPermissions, useMicrophonePermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fairDay } from "@/lib/data";
import { all, batch, insert, kvGet, kvSet, myId } from "@/lib/store";
import { syncSoon } from "@/lib/sync";
import { copyFile, keepFile, registerFile, resizeSoon, runUploads } from "@/lib/upload";
import { useVoiceNote } from "@/lib/voice";
import { Button, C, Chip, Row, T } from "@/ui/kit";

interface Shot { id: string; uri: string; mime: string }
interface Draft {
  startedAt: string;
  products: Shot[];
  cards: Shot[];
  video: Shot | null;
  qr: string | null;
  transcript: string;
  sameBooth: boolean;
  skipCard: boolean;
}
interface LastBooth { cards: Shot[]; qr: string | null; booth: string | null; hall: string | null; findId: string }

type Step = "product" | "card" | "extras";
const newDraft = (): Draft => ({ startedAt: new Date().toISOString(), products: [], cards: [], video: null, qr: null, transcript: "", sameBooth: false, skipCard: false });

function defaultHall(): string | null {
  const saved = kvGet<string>("hall");
  if (saved) return saved;
  const today = fairDay(new Date().toISOString());
  const a = all("hall_assignments").find((h) => h.user_id === myId() && h.date === today);
  return a?.halls?.[0] ?? null;
}

export function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const cam = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [focused, setFocused] = useState(true);
  const [ready, setReady] = useState(false);
  const [draft, setDraftState] = useState<Draft>(() => kvGet<Draft>("draft") ?? newDraft());
  const [hall, setHall] = useState<string | null>(defaultHall);
  const [mode, setMode] = useState<"picture" | "video">("picture");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ findId: string; n: number } | null>(null);
  const voice = useVoiceNote();
  const addingProduct = useRef(false);
  const last = kvGet<LastBooth>("lastBooth");

  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));

  const setDraft = (fn: (d: Draft) => Draft) => setDraftState((d) => { const n = fn(d); kvSet("draft", n); return n; });
  const step: Step = draft.products.length === 0 ? "product" : draft.cards.length === 0 && !draft.sameBooth && !draft.skipCard ? "card" : "extras";

  // keep transcript in the draft as it arrives
  useEffect(() => {
    if (voice.text && voice.text !== draft.transcript) setDraft((d) => ({ ...d, transcript: voice.text }));
  }, [voice.text]);

  if (!camPerm) return <View style={styles.fill} />;
  if (!camPerm.granted) {
    return (
      <View style={[styles.fill, styles.center, { padding: 24 }]}>
        <T size={20} bold style={{ marginBottom: 12 }}>Camera access needed</T>
        <Button title="Allow camera" onPress={requestCam} big />
      </View>
    );
  }

  async function shoot() {
    if (!cam.current || !ready || busy) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.85 });
      if (!pic?.uri) return;
      const id = uuidv7();
      const uri = keepFile(pic.uri, id, "image/jpeg");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (step === "product" || (step === "extras" && addingProduct.current)) {
        addingProduct.current = false;
        setDraft((d) => ({ ...d, products: [...d.products, { id, uri, mime: "image/jpeg" }] }));
      } else if (step === "card") {
        setDraft((d) => ({ ...d, cards: [...d.cards, { id, uri, mime: "image/jpeg" }] }));
      } else {
        // extras step: extra shots go to products
        setDraft((d) => ({ ...d, products: [...d.products, { id, uri, mime: "image/jpeg" }] }));
      }
    } catch (e) {
      Alert.alert("Photo failed", String(e));
    } finally {
      setBusy(false);
    }
  }
  async function toggleVideo() {
    if (!micPerm?.granted) {
      const r = await requestMic();
      if (!r.granted) return;
    }
    if (recording) { cam.current?.stopRecording(); return; }
    if (mode !== "video") { setMode("video"); return; }
    if (!cam.current || !ready) return;
    setRecording(true);
    try {
      const v = await cam.current.recordAsync({ maxDuration: 15 });
      if (v?.uri) {
        const id = uuidv7();
        const uri = keepFile(v.uri, id, "video/quicktime");
        setDraft((d) => ({ ...d, video: { id, uri, mime: "video/quicktime" } }));
      }
    } catch (e) {
      Alert.alert("Video failed", String(e));
    } finally {
      setRecording(false);
      setMode("picture");
    }
  }

  function onQr(r: BarcodeScanningResult) {
    if (!r.data || r.data === draft.qr) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDraft((d) => ({ ...d, qr: r.data }));
  }

  function save(gut: "fire" | "good" | "meh") {
    if (!draft.products.length) return;
    if (voice.recording) voice.stop();
    const me = myId();
    const transcript = [draft.transcript, voice.text].find((t) => t?.trim()) ?? "";
    const booth = parseBoothCode(transcript)?.booth ?? (draft.sameBooth ? last?.booth ?? null : null);
    let cards = draft.cards;
    let qr = draft.qr;
    if (draft.sameBooth && last) {
      cards = last.cards.map((c) => { const id = uuidv7(); return { id, uri: copyFile(c.uri, id, c.mime), mime: c.mime }; });
      qr = qr ?? last.qr;
    }
    let findId = "";
    batch(() => {
      const f = insert("finds", {
        captured_by: me, captured_at: draft.startedAt, hall, booth_code: booth, transcript: transcript || null, gut, qr_payload: qr,
        tags_ai: [], certifications: [], processing_state: "pending", stage: "found",
      });
      findId = f.id;
      const add = (s: Shot, kind: string) => {
        insert("media", { id: s.id, find_id: f.id, kind, upload_state: "pending", mime: s.mime });
        registerFile(s.id, s.uri, s.mime, kind);
      };
      draft.products.forEach((s) => add(s, "product_photo"));
      cards.forEach((s) => add(s, "card_photo"));
      if (draft.video) add(draft.video, "video");
      kvSet("lastBooth", { cards: cards.length ? cards : last?.cards ?? [], qr, booth, hall, findId: f.id } satisfies LastBooth);
      kvSet("draft", null);
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    [...draft.products, ...cards].forEach((s) => resizeSoon(s.id));
    setDraftState(newDraft());
    voice.reset();
    const today = fairDay(new Date().toISOString());
    const n = all("finds").filter((x) => x.captured_by === me && fairDay(x.captured_at) === today).length;
    setToast({ findId, n });
    setTimeout(() => setToast((t) => (t?.findId === findId ? null : t)), 6000);
    syncSoon(1500);
    setTimeout(() => void runUploads(), 2500);
  }

  function ping(findId: string) {
    const f = all("finds").find((x) => x.id === findId);
    insert("pings", { find_id: findId, from_user: myId(), hall: f?.hall ?? hall, booth_code: f?.booth_code ?? null, message: "Come look at this", sent_at: new Date().toISOString() });
    syncSoon(0);
    setToast(null);
    Alert.alert("Pinged the team 👀");
  }

  function pickHall() {
    Alert.prompt("Which hall are you in?", "e.g. 11.2", (v) => {
      const h = v?.trim() || null;
      setHall(h);
      kvSet("hall", h);
    }, "plain-text", hall ?? "");
  }

  function discard() {
    Alert.alert("Discard this capture?", undefined, [
      { text: "Keep", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { kvSet("draft", null); setDraftState(newDraft()); voice.reset(); } },
    ]);
  }

  const stepLabel = step === "product" ? "1 · Product photo" : step === "card" ? "2 · Business card (QR scans itself)" : "3 · Video / voice, then rate it";

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cam}
        style={StyleSheet.absoluteFill}
        active={focused}
        mode={mode}
        videoQuality="720p"
        onCameraReady={() => setReady(true)}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={step !== "product" ? onQr : undefined}
      />

      {/* top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Row>
          <Chip label={`📍 Hall ${hall ?? "?"}`} onPress={pickHall} />
          {last ? <Chip label="Same booth" active={draft.sameBooth} onPress={() => setDraft((d) => ({ ...d, sameBooth: !d.sameBooth }))} color={C.blue} /> : null}
          <Chip label="🇨🇳 Ask" onPress={() => router.push("/phrasebook")} />
        </Row>
        <T bold size={15} style={styles.stepLabel}>{stepLabel}</T>
        <Row>
          <Chip label={`📦 ${draft.products.length}`} />
          <Chip label={`🪪 ${draft.sameBooth ? "same" : draft.cards.length}`} />
          <Chip label={draft.qr ? "QR ✓" : "QR –"} active={!!draft.qr} color={C.good} />
          <Chip label={draft.video ? "🎥 ✓" : "🎥 –"} active={!!draft.video} color={C.good} />
          {draft.products.length ? <Chip label="✕" onPress={discard} /> : null}
        </Row>
        {draft.transcript || voice.text ? <T style={styles.transcript} numberOfLines={3}>“{voice.text || draft.transcript}”</T> : null}
        {voice.error ? <T style={{ color: C.bad }}>{voice.error}</T> : null}
      </View>

      {/* bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 70 }]}>
        {step === "extras" ? (
          <>
            <Row style={{ justifyContent: "center", marginBottom: 14 }} gap={12}>
              <Pressable onPressIn={() => void voice.start()} onPressOut={() => voice.stop()} style={[styles.round, voice.recording && { backgroundColor: C.bad }]}>
                <T size={28}>🎙️</T><T size={11} bold>{voice.recording ? "Listening" : "Hold"}</T>
              </Pressable>
              <Pressable onPress={toggleVideo} style={[styles.round, recording && { backgroundColor: C.bad }, mode === "video" && !recording && { borderColor: C.bad, borderWidth: 3 }]}>
                <T size={28}>🎥</T><T size={11} bold>{recording ? "Stop" : mode === "video" ? "Record" : "Video"}</T>
              </Pressable>
              <Pressable onPress={() => { addingProduct.current = true; void shoot(); }} style={styles.round}>
                <T size={28}>📷</T><T size={11} bold>+Photo</T>
              </Pressable>
            </Row>
            <Row style={{ justifyContent: "center" }} gap={10}>
              {(["fire", "good", "meh"] as const).map((g) => (
                <Pressable key={g} onPress={() => save(g)} style={styles.gut}>
                  <T size={34}>{g === "fire" ? "🔥" : g === "good" ? "👍" : "🤷"}</T>
                  <T size={12} bold>{g === "fire" ? "Winner?" : g === "good" ? "Good" : "Meh"}</T>
                </Pressable>
              ))}
            </Row>
          </>
        ) : (
          <View style={{ alignItems: "center" }}>
            <Pressable onPress={shoot} style={[styles.shutter, !ready && { opacity: 0.4 }]}>
              <View style={styles.shutterInner} />
            </Pressable>
            {step === "card" ? (
              <Button title="No card, skip" kind="ghost" onPress={() => setDraft((d) => ({ ...d, skipCard: true }))} style={{ marginTop: 12 }} />
            ) : null}
          </View>
        )}
      </View>

      {toast ? (
        <View style={[styles.toast, { top: insets.top + 120 }]}>
          <T bold>Saved ✓  #{toast.n} today</T>
          <Row>
            <Button title="👀 Come look" kind="secondary" onPress={() => ping(toast.findId)} />
            <Button title="Open" kind="ghost" onPress={() => { setToast(null); router.push(`/find/${toast.findId}`); }} />
          </Row>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center" },
  top: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: 12, gap: 8, backgroundColor: "rgba(0,0,0,0.35)", paddingBottom: 10 },
  stepLabel: { color: "#fff", textShadowColor: "#000", textShadowRadius: 4 },
  transcript: { color: "#fff", fontStyle: "italic" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 16, backgroundColor: "rgba(0,0,0,0.35)" },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff" },
  round: { width: 78, height: 78, borderRadius: 39, backgroundColor: "rgba(30,30,40,0.85)", alignItems: "center", justifyContent: "center" },
  gut: { width: 104, height: 84, borderRadius: 20, backgroundColor: "rgba(30,30,40,0.9)", alignItems: "center", justifyContent: "center" },
  toast: { position: "absolute", left: 16, right: 16, backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: C.good },
});
