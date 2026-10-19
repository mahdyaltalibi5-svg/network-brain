import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Notes from the cutting table" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Notes from the cutting table", eyebrow: "The Journal" });
}
