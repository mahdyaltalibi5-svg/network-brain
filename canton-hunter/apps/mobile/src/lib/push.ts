import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { syncSoon } from "./sync";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function registerPush(): Promise<void> {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await supabase.rpc("set_push_token", { token });
}

/** Tapping a notification opens the right screen. */
export function listenForTaps(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const d = resp.notification.request.content.data as { type?: string; find_id?: string; launch_id?: string };
    syncSoon(0);
    if (d.find_id) router.push(`/find/${d.find_id}`);
    else if (d.launch_id) router.push(`/launch/${d.launch_id}`);
    else if (d.type === "digest") router.push("/deals");
    else if (d.type === "content") router.push("/content");
  });
  return () => sub.remove();
}
