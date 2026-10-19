import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Bespoke Suits & Image Consulting in Salt Lake City" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Bespoke Suits & Image Consulting in Salt Lake City", eyebrow: "Summit Customs · Salt Lake City" });
}
