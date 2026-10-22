import type { Metadata } from "next";
import { Policy } from "@/components/policy";
import { disclaimer } from "@/lib/site";

export const metadata: Metadata = { title: "Research Use Only · Happy Pep" };

// Template copy: have a lawyer review before launch.
export default function ResearchUse() {
  return (
    <Policy title="Research Use Only">
      <p>{disclaimer}</p>
      <h2>Intended use</h2>
      <p>
        Every Happy Pep product is a research chemical intended exclusively for in-vitro laboratory and scientific research by qualified individuals. Products
        are not drugs, foods, dietary supplements or cosmetics.
      </p>
      <h2>What buyers agree to</h2>
      <ul>
        <li>You are at least 21 years old.</li>
        <li>Products will not be used in or on humans or animals, including injection, ingestion or topical application.</li>
        <li>You will handle, store and dispose of products in line with all applicable laws and laboratory safety practices.</li>
        <li>It is your responsibility to confirm that purchasing and possessing these products is lawful where you are.</li>
      </ul>
      <h2>Our content</h2>
      <p>We do not provide dosing, reconstitution-for-use or medical guidance, and nothing on this site is medical advice.</p>
    </Policy>
  );
}
