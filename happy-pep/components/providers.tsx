"use client";

import { useEffect } from "react";
import Script from "next/script";
import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
import { CartProvider } from "./cart";
import { CartDrawer } from "./cart-drawer";
import { GateProvider } from "./gate";
import { setLenis } from "@/lib/scroll";
import { site } from "@/lib/site";

function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.12 });
    setLenis(lenis);
    return () => {
      setLenis(null);
      lenis.destroy();
    };
  }, []);
  return null;
}

function TikTokPixel() {
  const id = site.tiktokPixelId;
  if (!id) return null;
  return (
    <Script id="tiktok-pixel" strategy="afterInteractive">
      {`!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(${JSON.stringify(id)});ttq.page();}(window, document, 'ttq');`}
    </Script>
  );
}

// reducedMotion="user": with prefers-reduced-motion on, transforms are
// dropped and only opacity fades remain.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        <GateProvider>
          {children}
          <CartDrawer />
        </GateProvider>
      </CartProvider>
      <SmoothScroll />
      <TikTokPixel />
    </MotionConfig>
  );
}
