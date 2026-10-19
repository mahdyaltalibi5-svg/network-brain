import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Visit the studio in Salt Lake City" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Visit the studio in Salt Lake City", eyebrow: "Contact" });
}
