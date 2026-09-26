import * as ImagePicker from "expo-image-picker";

export interface PickedPhoto { uri: string; mime: string }

/** Open the camera (phone) or a file picker with camera option (web). */
export async function takePhoto(): Promise<PickedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return pickPhoto();
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
  return r.canceled || !r.assets[0] ? null : { uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? "image/jpeg" };
}

/** Choose an existing photo. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  return r.canceled || !r.assets[0] ? null : { uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? "image/jpeg" };
}

/** Back-compat for search-by-photo. */
export async function launchCameraAsync(): Promise<string | null> {
  return (await takePhoto())?.uri ?? null;
}
