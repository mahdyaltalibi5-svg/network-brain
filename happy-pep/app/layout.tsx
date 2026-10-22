import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { gateScript } from "@/components/gate";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://happypep.com"),
  title: "Happy Pep · Same-day research peptides in Utah",
  description: "Third-party tested research peptides. Same-day delivery in Utah, 5 days anywhere in the USA, and free BAC water with every order.",
  openGraph: {
    title: "Happy Pep",
    description: "Same-day in Utah. 5 days everywhere else. Free BAC water with every order.",
    images: ["/happy-pep-logo.webp"],
  },
};

export const viewport: Viewport = { themeColor: "#0A2BC4" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: gateScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>
          <div id="site" className="flex min-h-dvh flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
