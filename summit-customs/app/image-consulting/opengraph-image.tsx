import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Image consulting for people whose presence is part of the job" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Image consulting for people whose presence is part of the job", eyebrow: "Image Consulting" });
}
