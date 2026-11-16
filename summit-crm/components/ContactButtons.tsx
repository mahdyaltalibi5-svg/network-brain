"use client";

import { withBase } from "@/lib/base";

/**
 * One-tap call / text / email. The tap is logged with sendBeacon (it survives the switch to the
 * dialer or Messages), and the first one stops the speed-to-lead clock.
 */
export function ContactButtons({ id, phone, email, text, size = "md" }: { id: string; phone?: string | null; email?: string | null; text: string; size?: "md" | "lg" }) {
  const tel = phone?.replace(/[^\d+]/g, "");
  const log = (channel: "call" | "text" | "email") => {
    const body = JSON.stringify({ channel });
    const url = withBase(`/api/leads/${id}/touch`);
    if (!navigator.sendBeacon?.(url, body)) fetch(url, { method: "POST", body, keepalive: true });
  };
  const cls = size === "lg" ? "btn !py-3 flex-1" : "btn flex-1 sm:flex-none";
  const ghost = size === "lg" ? "btn-ghost !py-3 flex-1" : "btn-ghost flex-1 sm:flex-none";
  return (
    <div className="flex flex-wrap gap-2">
      {tel && <a href={`tel:${tel}`} onClick={() => log("call")} className={cls}>Call</a>}
      {tel && <a href={`sms:${tel}?&body=${encodeURIComponent(text)}`} onClick={() => log("text")} className={ghost}>Text</a>}
      {email && (
        <a href={`mailto:${email}?subject=${encodeURIComponent("Your Summit Customs enquiry")}&body=${encodeURIComponent(text)}`} onClick={() => log("email")} className={ghost}>
          Email
        </a>
      )}
      {!tel && !email && <p className="text-sm text-stone">No phone or email on file.</p>}
    </div>
  );
}
