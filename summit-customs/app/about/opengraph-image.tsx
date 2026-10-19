import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Savile Row precision, Wasatch scale" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Savile Row precision, Wasatch scale", eyebrow: "About the Studio" });
}
