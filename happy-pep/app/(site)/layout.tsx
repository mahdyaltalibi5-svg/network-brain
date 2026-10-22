import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div id="site" className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </Providers>
  );
}
