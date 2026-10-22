import { Policy } from "@/components/policy";
import { site } from "@/lib/site";

export const metadata = { title: "Contact · Happy Pep" };

const field =
  "w-full rounded-2xl bg-white px-4 py-3.5 text-pep-ink ring-1 ring-pep-ink/10 placeholder:text-pep-ink/40 focus:outline-none focus:ring-2 focus:ring-pep-blue";

export default function Contact() {
  return (
    <Policy title="Say hi">
      <p>
        Real humans, fast replies. Email <a href={`mailto:${site.email}`}>{site.email}</a> or use the form below.
      </p>
      {/* Opens the visitor's email app. Swap for a form backend when you have one. */}
      <form action={`mailto:${site.email}`} method="post" encType="text/plain" className="!mt-8 space-y-3">
        <input name="name" required placeholder="Name" className={field} />
        <input name="email" type="email" required placeholder="Email" className={field} />
        <input name="order" placeholder="Order number (optional)" className={field} />
        <textarea name="message" required rows={5} placeholder="How can we help?" className={field} />
        <button className="h-14 w-full rounded-full bg-pep-blue font-display text-lg font-semibold text-white transition-transform active:scale-[0.97]">
          Send
        </button>
      </form>
    </Policy>
  );
}
