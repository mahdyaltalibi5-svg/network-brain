import type { Metadata } from "next";
import { SplitHeading } from "@/components/motion";
import { PartnerForm } from "@/components/partner-form";

export const metadata: Metadata = {
  title: "Work With Us · Happy Pep",
  description: "Wholesale and bulk pricing for labs, and a partner program for creators who follow research-use rules.",
};

export default function WorkWithUs() {
  return (
    <>
      <section className="bg-pep-blue pb-16 pt-12 text-center text-white md:pt-20">
        <div className="mx-auto max-w-2xl px-4">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-pep-mint">Partner program</p>
          <SplitHeading as="h1" text="Work with Happy Pep" accent={["Happy", "Pep"]} className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl" />
          <p className="mt-4 text-lg text-white/80">Two programs, one standard. Bulk pricing for labs, and a partner program for creators who take compliance seriously.</p>
        </div>
      </section>
      <section className="bg-pep-cloud py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <PartnerForm />
        </div>
      </section>
    </>
  );
}
