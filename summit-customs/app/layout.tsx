import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/ui/JsonLd";
import { business, SITE_URL } from "@/content/business";
import { graph, localBusiness, organization, website } from "@/lib/seo/jsonld";
import "./globals.css";

// Every route must be fully prerendered. The build fails if anything becomes request-time.
export const ensureStatic = "navigation";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
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
    <html lang="en-US" className={`${display.variable} ${sans.variable}`}>
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
        <JsonLd data={graph(organization(), localBusiness(), website())} />
      </body>
    </html>
  );
}
