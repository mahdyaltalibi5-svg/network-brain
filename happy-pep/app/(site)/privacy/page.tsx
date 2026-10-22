import { Policy } from "@/components/policy";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy Policy · Happy Pep" };

// Template copy: have a lawyer review before launch.
export default function Privacy() {
  return (
    <Policy title="Privacy Policy">
      <h2>What we collect</h2>
      <p>Your name, email, phone, and shipping address when you order, plus basic site usage data.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To process, ship, and support your orders.</li>
        <li>To measure our ads. We use the TikTok Pixel, which records page views and shopping events.</li>
      </ul>

      <h2>Sharing</h2>
      <p>We share data only with the services needed to run the store (payments, shipping, analytics). We never sell your information.</p>

      <h2>Your choices</h2>
      <p>
        To access or delete your data, email <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </Policy>
  );
}
