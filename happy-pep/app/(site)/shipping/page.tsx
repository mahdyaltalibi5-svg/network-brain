import { Policy } from "@/components/policy";
import { site } from "@/lib/site";

export const metadata = { title: "Shipping Policy · Happy Pep" };

export default function Shipping() {
  return (
    <Policy title="Shipping Policy">
      <h2>Same-day Utah delivery</h2>
      <p>
        Orders placed before {site.cutoffHour}:00 PM Mountain Time, Monday through Friday, are delivered the same day in:{" "}
        {site.sameDayZones.join(", ")}. Orders placed after the cutoff, on weekends, or on holidays are delivered the next business day.
      </p>

      <h2>5-day nationwide guarantee</h2>
      <p>
        Everywhere else in the contiguous United States, your order arrives within 5 business days of shipping. The clock starts when the carrier
        scans your package. If it arrives late, email us your order number and we&apos;ll refund your shipping cost.
      </p>
      <ul>
        <li>Excludes Alaska, Hawaii, U.S. territories, PO boxes and APO/FPO addresses.</li>
        <li>Excludes delays from incorrect addresses or severe weather.</li>
      </ul>

      <h2>Free BAC water</h2>
      <p>Every order includes bacteriostatic water at no charge.</p>

      <h2>Tracking</h2>
      <p>You&apos;ll get a tracking link by email as soon as your order ships.</p>

      <p>
        Questions? <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
    </Policy>
  );
}
