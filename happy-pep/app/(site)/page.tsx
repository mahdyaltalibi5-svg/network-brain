import { Hero } from "@/components/hero";
import { Store } from "@/components/store";
import { HowItWorks, TrustMarquee } from "@/components/sections";
import { Faq, OurPromise, Reviews, Tested } from "@/components/trust";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustMarquee />
      <Store />
      <HowItWorks />
      <Tested />
      <OurPromise />
      <Reviews />
      <Faq />
    </>
  );
}
