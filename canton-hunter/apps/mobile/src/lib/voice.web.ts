/** WEB DEMO: browsers can't do the iPhone's offline dictation, so holding the mic "hears" a sample note. */
import { useRef, useState } from "react";

const SAMPLES = [
  "LED sunset lamp, two ten FOB, MOQ 500, they can do our logo, lead time 20 days",
  "cat grooming glove, 9 RMB, MOQ 1000, factory, 15 days",
  "heated neck wrap, 4.50, MOQ 300, booth 12.2 A 31, CE certified",
];
let n = 0;

export function useVoiceNote() {
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState("");
  const audioUri = useRef<string | null>(null);
  return {
    recording, text, finalText: text, error: null as string | null, audioUri,
    start: async () => setRecording(true),
    stop: () => { setRecording(false); setText(SAMPLES[n++ % SAMPLES.length]!); },
    reset: () => setText(""),
  };
}
