import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/layout/Header";
import { SiteMotion } from "@/components/motion/SiteMotion";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/ui/JsonLd";
import { business, SITE_URL } from "@/content/business";
import { INTRO_BOOT } from "@/lib/intro-boot";
import { graph, localBusiness, organization, website } from "@/lib/seo/jsonld";
import "./fonts/fallbacks.css";
import "./globals.css";

// Every route must be fully prerendered. The build fails if anything becomes request-time.
export const ensureStatic = "navigation";

// Self-hosted, subsetted to the characters the site uses (scripts/fetch-fonts.mjs, SIL OFL).
// Fallbacks are metric-adjusted per platform (scripts/gen-font-fallbacks.mjs) so swapping in causes no layout shift.
const display = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "./fonts/cormorant-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-500-italic.woff2", weight: "500", style: "italic" },
  ],
  display: "swap",
  // metric-adjusted fallbacks for every platform (app/fonts/fallbacks.css), not just Times New Roman
  adjustFontFallback: false,
  fallback: ["Cormorant Fallback", "Cormorant Fallback Android", "Georgia", "serif"],
});

const sans = localFont({
  variable: "--font-manrope",
  src: [{ path: "./fonts/manrope-var.woff2", weight: "400 600", style: "normal" }],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Manrope Fallback", "Manrope Fallback Android", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${business.name} | Bespoke Suits & Image Consulting, Salt Lake City`, template: `%s | ${business.name}` },
  description: business.shortDescription,
  applicationName: business.name,
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const viewport: Viewport = {
  themeColor: "#07080A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-US" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        {/* Homepage intro: decides the intro mode before first paint (no-op on other pages / without JS) */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-50 bg-gold px-5 py-3 text-void focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <SiteMotion />
        <JsonLd data={graph(organization(), localBusiness(), website())} />
      </body>
    </html>
  );
}
