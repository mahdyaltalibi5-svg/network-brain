import { File, Paths } from "expo-file-system";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import { Alert } from "react-native";
import { remoteUrl } from "./data";
import { localUri } from "./upload";

/** Save a clip to the iPhone's Photos (local file if this phone shot it, else download it first). */
export async function saveToPhotos(mediaId: string, storagePath: string | null) {
  const perm = await requestPermissionsAsync(true);
  if (perm.status !== "granted") { Alert.alert("Allow Photos access to save clips"); return; }
  let uri = localUri(mediaId);
  if (!uri) {
    if (!storagePath) throw new Error("Clip hasn't uploaded yet");
    const url = await remoteUrl(storagePath);
    if (!url) throw new Error("Couldn't get a download link");
    const dest = new File(Paths.cache, `${mediaId}.mov`);
    if (!dest.exists) await File.downloadFileAsync(url, dest);
    uri = dest.uri;
  }
  await Asset.create(uri);
  Alert.alert("Saved to Photos", "Edit in CapCut, then post.");
}
