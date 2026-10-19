import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/Button";
import { RidgeBackdrop } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="relative flex min-h-[80svh] items-center overflow-hidden pt-32 pb-20">
      <RidgeBackdrop />
      <div className="container-site relative">
        <p className="eyebrow">404</p>
        <h1 className="mt-6 text-[clamp(3rem,8vw,7rem)] text-ivory">Off the trail.</h1>
        <p className="mt-6 max-w-lg text-lg text-ivory-dim">That page doesn&rsquo;t exist. Let&rsquo;s get you back to the summit.</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <LinkButton href="/">Home</LinkButton>
          <LinkButton href="/book" variant="ghost">Book a Private Fitting</LinkButton>
        </div>
      </div>
    </section>
  );
}
