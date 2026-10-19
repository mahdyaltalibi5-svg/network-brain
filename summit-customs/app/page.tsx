import type { Metadata } from "next";
import {
  AnatomySection,
  FabricSection,
  HomeFaqSection,
  HomeHero,
  ImageConsultingSection,
  OccasionsSection,
  ProcessSection,
  TestimonialsSection,
} from "@/components/sections/home";
import { IntroVeil } from "@/components/intro/IntroVeil";
import { ScrollScenes } from "@/components/motion/ScrollScenes";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";
import { homeFaqs } from "@/content/faq";
import { serviceList } from "@/content/services";
import { pageMeta } from "@/lib/seo/metadata";
import { faqPage, graph, service, webPage } from "@/lib/seo/jsonld";

const title = "Bespoke Suits & Image Consulting in Salt Lake City | Summit Customs";
const description =
  "Custom and bespoke suits in Salt Lake City, cut from your own pattern over multiple fittings, plus image consulting for executives, grooms and professionals across Utah.";

export const metadata: Metadata = pageMeta({
  title,
  description,
  path: "/",
  keywords: ["bespoke suits Salt Lake City", "custom suits Salt Lake City", "made to measure suits Utah"],
});

export default function HomePage() {
  return (
    <>
      <IntroVeil />
      <HomeHero />
      <ProcessSection />
      <AnatomySection />
      <FabricSection />
      <ImageConsultingSection />
      <OccasionsSection />
      <TestimonialsSection />
      <HomeFaqSection />
      <CtaBand />
      <ScrollScenes />
      <JsonLd data={graph(webPage("/", title, description), ...serviceList.map(service), faqPage(homeFaqs, "/"))} />
    </>
  );
}
