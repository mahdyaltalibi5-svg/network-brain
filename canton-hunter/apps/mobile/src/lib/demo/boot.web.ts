/** WEB DEMO boot: react-native-web's Alert does nothing, so map it to browser dialogs. */
import { Alert, type AlertButton } from "react-native";
import { resetDemoDb } from "../db.web";

export const DEMO = true;

Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  const text = [title, message].filter(Boolean).join("\n\n");
  const actions = (buttons ?? []).filter((b) => b.style !== "cancel");
  if ((buttons ?? []).length <= 1) { globalThis.alert(text); buttons?.[0]?.onPress?.(); return; }
  if (globalThis.confirm(`${text}\n\nOK = ${actions[actions.length - 1]?.text ?? "OK"}`)) actions[actions.length - 1]?.onPress?.();
  else (buttons ?? []).find((b) => b.style === "cancel")?.onPress?.();
};
Alert.prompt = ((title: string, message?: string, cb?: ((v: string) => void) | AlertButton[], _type?: string, def?: string) => {
  const v = globalThis.prompt([title, message].filter(Boolean).join("\n"), def ?? "");
  if (v !== null && typeof cb === "function") cb(v);
}) as typeof Alert.prompt;

export function resetDemo() {
  resetDemoDb();
  globalThis.location?.reload();
}
