import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import { gateScript } from "@/components/gate";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { site } from "@/lib/site";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: "Happy Pep · Same-day research peptides in Utah",
  description: "Third-party tested research peptides. Same-day delivery in Utah, 5 days anywhere in the USA, and free BAC water with every order.",
  openGraph: {
    title: "Happy Pep",
    description: "Same-day in Utah. 5 days everywhere else. Free BAC water with every order.",
  },
};

export const viewport: Viewport = { themeColor: "#0125C4" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: gateScript }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
