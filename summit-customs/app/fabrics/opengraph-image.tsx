import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Cloth chosen for altitude, season and use" + " | Summit Customs";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({ title: "Cloth chosen for altitude, season and use", eyebrow: "Fabrics" });
}
