/** WEB DEMO: no file system or uploads. Captured photos stay in memory as data/blob URLs. */
import { demoImages } from "./demo/seed";

const captured = new Map<string, string>();
export const MEDIA_DIR = null;
export const keepFile = (tempUri: string, _id: string, _mime: string) => tempUri;
export const copyFile = (uri: string, _id: string, _mime: string) => uri;
export function registerFile(mediaId: string, uri: string, _mime: string, _kind: string) { captured.set(mediaId, uri); }
export const localUri = (mediaId: string): string | null => captured.get(mediaId) ?? demoImages.get(mediaId) ?? null;
export const uploadStats = () => ({ pending: 0, failed: 0 });
export const resizeSoon = (_id: string) => {};
export const runUploads = async () => {};
