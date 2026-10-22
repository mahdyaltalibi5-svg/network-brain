import { Hero } from "@/components/hero";
import { Store } from "@/components/store";
import { Faq, OurPromise, Reviews, Tested } from "@/components/trust";

export default function Home() {
  return (
    <>
      <Hero />
      <Store />
      <Tested />
      <OurPromise />
      <Reviews />
      <Faq />
    </>
  );
}
