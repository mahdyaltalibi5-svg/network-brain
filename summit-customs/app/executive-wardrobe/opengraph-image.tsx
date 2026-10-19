import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "An executive wardrobe, planned, built and maintained" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "An executive wardrobe, planned, built and maintained", eyebrow: "Executive Wardrobe" });
}
