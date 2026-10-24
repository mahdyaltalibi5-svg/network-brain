import { business } from "@/content/business";
import { booking, bookingMailto } from "@/lib/booking";
import { isPh } from "@/lib/ph";
import { LinkButton } from "./Button";

/**
 * The booking area on /book. Google's booking page is light-themed, so it sits on an ivory
 * card, framed like a swatch, rather than fighting the dark page.
 */
export function BookingCalendar() {
  const emailReady = !isPh(business.email);
  return (
    <section id="calendar" aria-labelledby="calendar-title" className="container-site pb-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Choose a time</p>
          <h2 id="calendar-title" className="mt-4 text-[clamp(2.2rem,4.4vw,3.6rem)] text-ivory">
            {booking.kind === "none" ? "Request a fitting" : "Pick a date and time"}
          </h2>
        </div>
        {booking.kind !== "none" && (
          <a href={booking.href} target="_blank" rel="noopener" className="text-sm text-gold-bright underline underline-offset-4">
            Open the booking page in a new tab
          </a>
        )}
      </div>

      {booking.kind === "embed" && (
        <div className="border border-line bg-ivory p-2 md:p-4">
          <iframe
            src={booking.embedSrc}
            title="Summit Customs booking calendar (Google Calendar)"
            width="100%"
            height="720"
            loading="lazy"
            className="block h-[860px] w-full border-0 bg-white md:h-[720px]"
          />
        </div>
      )}

      {booking.kind === "link" && (
        <div className="border border-line-soft p-8">
          <p className="max-w-xl text-ivory-dim">
            See live availability and book your consultation on our booking page. You&rsquo;ll get a calendar
            invitation by email as soon as it&rsquo;s confirmed.
          </p>
          <div className="mt-6">
            <LinkButton href={booking.href}>See available times</LinkButton>
          </div>
        </div>
      )}

      {booking.kind === "none" && emailReady && (
        <div className="border border-line-soft p-8">
          <p className="max-w-xl text-ivory-dim">
            Pick a day and a time that suit you, in person or by video. Your request goes straight to Kobe, who
            confirms your private fitting personally.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <LinkButton href="/book-consultation.html">Pick a day and time</LinkButton>
            <a className="text-sm text-gold-bright underline underline-offset-4" href={bookingMailto()}>
              Or email {business.email}
            </a>
          </div>
        </div>
      )}

      {emailReady && booking.kind !== "none" && (
        <p className="mt-6 text-sm text-ivory-dim">
          Prefer email? <a className="text-gold-bright underline underline-offset-4" href={bookingMailto()}>Request a time by email</a> at{" "}
          {business.email}.
        </p>
      )}
    </section>
  );
}
