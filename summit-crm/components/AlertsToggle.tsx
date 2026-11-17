"use client";

import { withBase } from "@/lib/base";

import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on" | "busy";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** Turns lead alerts on for this phone or laptop (Web Push via the service worker). */
export function AlertsToggle({ publicKey, compact = false }: { publicKey?: string; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState(ios && !standalone ? "ios-install" : "unsupported");
      const reg = await navigator.serviceWorker.register(withBase("/sw.js"), { scope: withBase("/") });
      if (Notification.permission === "denied") return setState("blocked");
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    if (!publicKey) return setMsg("Alerts aren't set up on the server yet.");
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      if ((await Notification.requestPermission()) !== "granted") return setState("blocked");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
      const label = /iphone|android|ipad/i.test(navigator.userAgent) ? "Phone" : "Computer";
      const res = await fetch(withBase("/api/push/subscribe"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), label }) });
      if (!res.ok) throw new Error();
      setState("on");
      setMsg("Alerts are on for this device.");
    } catch {
      setState("off");
      setMsg("Couldn't turn alerts on. Try again.");
    }
  }

  async function disable() {
    setState("busy");
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) {
      await fetch(withBase("/api/push/subscribe"), { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
    setMsg("");
  }

  if (state === "loading" || (compact && state === "on")) return null;
  const note: Partial<Record<State, string>> = {
    "ios-install": "On iPhone: tap Share → Add to Home Screen, open Summit from your home screen, then turn alerts on.",
    unsupported: "This browser can't receive alerts. Use Chrome or Safari, or the app on your phone.",
    blocked: "Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.",
  };
  return (
    <div className={compact ? "card flex flex-wrap items-center gap-4 border-gold/40 p-4" : "flex flex-wrap items-center gap-4"}>
      {compact && <p className="text-sm">Get a notification the second a lead comes in.</p>}
      {note[state] ? (
        <p className="text-sm text-warn">{note[state]}</p>
      ) : state === "on" ? (
        <>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              setMsg("Sending…");
              const r = await fetch(withBase("/api/push/test"), { method: "POST" });
              const j = (await r.json().catch(() => ({}))) as { sent?: number; error?: string };
              setMsg(r.ok ? `Test alert sent to ${j.sent} device${j.sent === 1 ? "" : "s"}. It should arrive in a few seconds.` : (j.error ?? "Couldn't send a test alert."));
            }}
          >
            Send a test alert
          </button>
          <button type="button" className="btn-ghost" onClick={disable}>Turn alerts off on this device</button>
        </>
      ) : (
        <button type="button" className="btn" onClick={enable} disabled={state === "busy"}>
          {state === "busy" ? "Turning on…" : "Turn on lead alerts"}
        </button>
      )}
      {msg && <p role="status" className="text-sm text-ivory-dim">{msg}</p>}
    </div>
  );
}
