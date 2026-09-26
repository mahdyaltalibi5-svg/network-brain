import { Alert } from "react-native";

export async function saveToPhotos(_mediaId: string, _storagePath: string | null): Promise<void> {
  Alert.alert("Saves to Photos on iPhone", "In the app this downloads the clip into your camera roll so you can edit it in CapCut.");
}
