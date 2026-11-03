import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Summit CRM", template: "%s · Summit CRM" },
  description: "Client pipeline for Summit Customs, connected to Meta Lead Ads.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#07080A", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
