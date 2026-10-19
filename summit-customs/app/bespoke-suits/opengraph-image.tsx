import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Bespoke suits, cut from your own pattern" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Bespoke suits, cut from your own pattern", eyebrow: "Bespoke Suits" });
}
