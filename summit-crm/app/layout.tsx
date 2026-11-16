import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Summit CRM", template: "%s · Summit CRM" },
  description: "Client pipeline for Summit Customs, connected to Meta Lead Ads.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Summit", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#07080A", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
