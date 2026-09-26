/** Hold-to-talk voice notes, transcribed ON THE DEVICE (works with no internet). */
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { Paths } from "expo-file-system";
import { useRef, useState } from "react";

const HINTS = ["MOQ", "FOB", "OEM", "RMB", "yuan", "WeChat", "booth", "hall", "sample", "lead time", "logo", "packaging", "factory", "Amazon", "TikTok"];

export function useVoiceNote() {
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioUri = useRef<string | null>(null);

  useSpeechRecognitionEvent("start", () => setRecording(true));
  useSpeechRecognitionEvent("end", () => { setRecording(false); setInterim(""); });
  useSpeechRecognitionEvent("result", (e) => {
    const t = e.results[0]?.transcript ?? "";
    if (e.isFinal) {
      setFinalText((prev) => (prev ? `${prev} ${t}` : t).trim());
      setInterim("");
    } else setInterim(t);
  });
  useSpeechRecognitionEvent("audioend", (e) => { audioUri.current = e.uri ?? null; });
  useSpeechRecognitionEvent("error", (e) => {
    if (e.error !== "no-speech" && e.error !== "aborted") setError(e.message || e.error);
    setRecording(false);
  });

  async function start() {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) { setError("Microphone / speech permission denied"); return; }
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
      contextualStrings: HINTS,
      iosTaskHint: "dictation",
      recordingOptions: { persist: true, outputDirectory: Paths.document.uri },
    });
  }
  const stop = () => ExpoSpeechRecognitionModule.stop();
  const reset = () => { setFinalText(""); setInterim(""); audioUri.current = null; };

  return { recording, text: [finalText, interim].filter(Boolean).join(" "), finalText, error, start, stop, reset, audioUri };
}
