import { Hero } from "@/components/hero";
import { Store } from "@/components/store";
import { HowItWorks, TrustMarquee } from "@/components/sections";
import { Faq, OurPromise, Reviews, WhyUs } from "@/components/trust";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustMarquee />
      <OurPromise />
      <Store />
      <HowItWorks />
      <WhyUs />
      <Reviews />
      <Faq />
    </>
  );
}
