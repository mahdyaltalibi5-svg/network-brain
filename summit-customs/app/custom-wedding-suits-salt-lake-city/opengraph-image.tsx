import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Custom wedding suits for Utah grooms" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Custom wedding suits for Utah grooms", eyebrow: "Custom Wedding Suits" });
}
