import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Book a Private Fitting" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Book a Private Fitting", eyebrow: "Private consultations" });
}
