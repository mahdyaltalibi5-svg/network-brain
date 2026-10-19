import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Five steps from consultation to final fitting" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Five steps from consultation to final fitting", eyebrow: "The Process" });
}
