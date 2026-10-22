import { Policy } from "@/components/policy";
import { site } from "@/lib/site";

export const metadata = { title: "Refund Policy · Happy Pep" };

// Template copy: adjust to match how you actually handle returns.
export default function Refunds() {
  return (
    <Policy title="Refund Policy">
      <h2>Unopened products</h2>
      <p>Unopened, sealed vials can be returned within 14 days of delivery for a full refund of the product price.</p>

      <h2>Damaged or wrong items</h2>
      <p>
        If something arrives damaged or isn&apos;t what you ordered, email us within 7 days with your order number and a photo. We&apos;ll ship a
        replacement or refund you, your choice.
      </p>

      <h2>Late deliveries</h2>
      <p>Covered by our 5-day guarantee: if your order arrives late, we refund your shipping. See the Shipping Policy for details.</p>

      <h2>How to start a return</h2>
      <p>
        Email <a href={`mailto:${site.email}`}>{site.email}</a> with your order number. Refunds go back to your original payment method within 5–10
        business days of approval.
      </p>
    </Policy>
  );
}
