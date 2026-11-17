"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { withBase } from "@/lib/base";

const SUBJECT = "Your custom suit with Summit Custom Suits"; // keep in step with EMAIL_SUBJECT in lib/speed.ts

/**
 * One-tap call / text / email. Every tap is logged on the lead automatically (the first one stops
 * the speed-to-lead clock). The log is sent before the phone switches to the dialer, Messages or
 * Mail, so it lands on iPhone too, then the app opens.
 */
export function ContactButtons({ id, phone, email, text, size = "md" }: { id: string; phone?: string | null; email?: string | null; text: string; size?: "md" | "lg" }) {
  const router = useRouter();
  const [logged, setLogged] = useState<string | null>(null);
  const tel = phone?.replace(/[^\d+]/g, "");
  const go = (channel: "call" | "text" | "email", href: string) => async (e: React.MouseEvent) => {
    e.preventDefault();
    const body = JSON.stringify({ channel });
    const url = withBase(`/api/leads/${id}/touch`);
    // Wait briefly for the log (never more than ~700 ms), then hand off to the phone.
    await Promise.race([
      fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => navigator.sendBeacon?.(url, body)),
      new Promise((r) => setTimeout(r, 700)),
    ]);
    setLogged({ call: "Call logged", text: "Text logged", email: "Email logged" }[channel]);
    window.location.href = href;
    router.refresh(); // the activity log and "waiting" list show it when Kobe comes back
  };
  const cls = size === "lg" ? "btn !py-3 flex-1" : "btn flex-1 sm:flex-none";
  const ghost = size === "lg" ? "btn-ghost !py-3 flex-1" : "btn-ghost flex-1 sm:flex-none";
  const sms = tel ? `sms:${tel}?&body=${encodeURIComponent(text)}` : "";
  const mail = email ? `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(text)}` : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tel && <a href={`tel:${tel}`} onClick={go("call", `tel:${tel}`)} className={cls}>Call</a>}
      {tel && <a href={sms} onClick={go("text", sms)} className={ghost}>Text</a>}
      {email && <a href={mail} onClick={go("email", mail)} className={ghost}>Email</a>}
      {!tel && !email && <p className="text-sm text-stone">No phone or email on file.</p>}
      {logged && <span role="status" className="inline-flex w-full items-center gap-1 text-xs text-ok sm:w-auto"><Check className="h-3.5 w-3.5" aria-hidden="true" />{logged} on this lead</span>}
    </div>
  );
}
