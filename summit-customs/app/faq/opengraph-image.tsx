import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Custom suits in Salt Lake City, answered plainly" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Custom suits in Salt Lake City, answered plainly", eyebrow: "Frequently Asked" });
}
