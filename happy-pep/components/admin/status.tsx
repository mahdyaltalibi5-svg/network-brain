import { STATUS_META, type OrderStatus } from "@/lib/order-types";

// Status always shows icon + label; color is never the only signal.
const TONES = {
  muted: "bg-[#F0F2F8] text-[#52566B]",
  warning: "bg-[#FFF4DA] text-[#7A5200]",
  info: "bg-[#EEF1FD] text-[#1A36A8]",
  good: "bg-[#E4F6E4] text-[#006300]",
  critical: "bg-[#FBE7E7] text-[#A32A2A]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[m.tone]}`}>
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  );
}

export function ZoneBadge({ zone }: { zone: "sameday" | "utah" | "usa" }) {
  if (zone !== "sameday") return null;
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E3FBF2] px-2 py-0.5 text-[11px] font-bold text-[#0B6B4A]">⚡ Same-day</span>;
}
