import * as ImagePicker from "expo-image-picker";

/** Open the system camera for a single quick photo. Returns a file uri or null if cancelled. */
export async function launchCameraAsync(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
  return r.canceled ? null : r.assets[0]?.uri ?? null;
}
