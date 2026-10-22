import { Policy } from "@/components/policy";
import { disclaimer, site } from "@/lib/site";

export const metadata = { title: "Terms of Service · Happy Pep" };

// Template copy: have a lawyer review before launch.
export default function Terms() {
  return (
    <Policy title="Terms of Service">
      <p>By using this site or placing an order with Happy Pep, you agree to these terms.</p>

      <h2>Eligibility</h2>
      <p>You must be at least 21 years old to use this site and purchase products.</p>

      <h2>Research use only</h2>
      <p>{disclaimer}</p>
      <p>
        By purchasing, you confirm that products will be used only for lawful laboratory research by qualified individuals, and not for human
        or animal consumption, injection, or any diagnostic or therapeutic use.
      </p>

      <h2>Orders and pricing</h2>
      <p>We may refuse or cancel any order, including when a product is mispriced or we can&apos;t verify the order. Prices can change without notice.</p>

      <h2>Shipping and refunds</h2>
      <p>Delivery promises and refunds are governed by our Shipping Policy and Refund Policy.</p>

      <h2>Limitation of liability</h2>
      <p>
        Products are provided as-is for research purposes. To the fullest extent permitted by law, Happy Pep is not liable for any misuse of
        products or any indirect or consequential damages.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
    </Policy>
  );
}
