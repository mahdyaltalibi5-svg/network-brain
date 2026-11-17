import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { metaCreds } from "@/lib/meta/creds";
import { money, num } from "@/lib/format";
import { funnelByCampaign } from "@/lib/leads";
import { DATE_PRESETS, fetchCampaignSpend, isDatePreset, joinCampaigns, presetRange, type CampaignSpend, type DatePreset } from "@/lib/meta/insights";
import { adRows, campaignSpend, hasSyncedAds, type AdRow } from "@/lib/meta/ads-report";
import { when } from "@/lib/format";

export const metadata: Metadata = { title: "Meta ads" };

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await connection();
  const { range } = await searchParams;
  const preset: DatePreset = isDatePreset(range) ? range : "last_30d";
  const { since, until } = presetRange(preset);
  const m = await metaCreds();
  const connected = !!(m.adAccountId && m.adsToken);

  let spend: CampaignSpend[] = [];
  let ads: AdRow[] = [];
  let error: string | null = m.adsError ?? null;
  const synced = await hasSyncedAds();
  if (synced) {
    // the ad account is mirrored automatically: read it from the database
    [spend, ads] = await Promise.all([campaignSpend(since, until), adRows(since, until)]);
  } else if (connected) {
    try {
      spend = await fetchCampaignSpend(preset); // first sync still running
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  const rows = joinCampaigns(spend, await funnelByCampaign(since, until));
  const t = rows.reduce(
    (a, r) => ({ spend: a.spend + r.spend, leads: a.leads + r.leads, booked: a.booked + r.booked, ordered: a.ordered + r.ordered, revenue: a.revenue + r.revenueCents / 100 }),
    { spend: 0, leads: 0, booked: 0, ordered: 0, revenue: 0 },
  );
  const per = (a: number, b: number) => (b > 0 ? money(a / b) : "—");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Meta ads</p>
          <h1 className="mt-2 font-display text-4xl">What the ad spend buys</h1>
          <p className="mt-2 max-w-2xl text-sm text-ivory-dim">
            Spend comes from the Meta ad account. Leads, bookings and orders come from this CRM, matched by campaign and ad, for leads that arrived in the same period.
          </p>
          {m.adsSyncedAt && <p className="mt-1 text-xs text-stone">Updated automatically · last synced {when(m.adsSyncedAt)}</p>}
        </div>
        <nav aria-label="Date range" className="flex flex-wrap gap-2">
          {Object.entries(DATE_PRESETS).map(([k, label]) => (
            <Link key={k} href={`/ads?range=${k}`} aria-current={k === preset ? "page" : undefined} className={k === preset ? "btn" : "btn-ghost"}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {!connected && (
        <p className="card mt-6 border-warn/40 p-4 text-sm">
          Meta isn&rsquo;t connected yet, so costs show as $0. Connect Facebook once in{" "}
          <Link href="/settings#meta" className="text-gold underline">Settings</Link> and every campaign, ad and result syncs on its own.
        </p>
      )}
      {error && (
        <p role="alert" className="card mt-6 p-4 text-sm text-bad">
          Meta returned an error: {error}
        </p>
      )}

      <dl className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["Spend", money(t.spend)],
            ["Leads", num(t.leads)],
            ["Cost per lead", per(t.spend, t.leads)],
            ["Consultations booked", num(t.booked)],
            ["Cost per booking", per(t.spend, t.booked)],
            ["Return on ad spend", t.spend > 0 ? `${(t.revenue / t.spend).toFixed(1)}×` : "—"],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="tile">
            <dt className="text-xs text-stone">{k}</dt>
            <dd className="mt-1 font-display text-3xl">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="card mt-8 overflow-x-auto p-2 md:p-4">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Campaign performance</caption>
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-stone">
              {["Campaign", "Spend", "Clicks", "Leads", "Cost / lead", "Booked", "Cost / booking", "Orders", "Revenue", "ROAS"].map((h, i) => (
                <th key={h} scope="col" className={`py-2 font-medium ${i ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-stone">
                  No campaign activity in this period yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.campaignId} className="border-b border-white/5 last:border-0">
                <th scope="row" className="py-3 text-left font-normal">
                  {r.campaignName}
                </th>
                <td className="text-right">{money(r.spend)}</td>
                <td className="text-right">{num(r.clicks)}</td>
                <td className="text-right">{num(r.leads)}</td>
                <td className="text-right">{money(r.costPerLead)}</td>
                <td className="text-right">{num(r.booked)}</td>
                <td className="text-right">{money(r.costPerBooking)}</td>
                <td className="text-right">{num(r.ordered)}</td>
                <td className="text-right">{money(r.revenueCents, { cents: true })}</td>
                <td className="text-right">{r.roas == null ? "—" : `${r.roas.toFixed(1)}×`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ads.length > 0 && (
        <section aria-labelledby="ads-h" className="mt-10">
          <h2 id="ads-h" className="font-display text-2xl">Ads</h2>
          <p className="mt-1 text-sm text-ivory-dim">Each ad&rsquo;s results in this period. &ldquo;Meta leads&rdquo; is what Meta counted; the CRM columns are the people who actually came in from that ad.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="ads">
            {ads.map((a) => (
              <li key={a.id} className="tile !p-4">
                <div className="flex gap-3">
                  {a.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Meta CDN thumbnails
                    <img src={a.thumbnail} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="h-16 w-16 shrink-0 rounded-xl bg-white/5" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-xs text-stone">{a.campaign ?? "—"}</p>
                    <span className={`pill mt-1.5 ${a.status === "ACTIVE" ? "!text-ok" : ""}`}>{a.status === "ACTIVE" ? "Running" : (a.status ?? "—").toLowerCase().replace(/_/g, " ")}</span>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-y-3 text-sm">
                  {([
                    ["Spend", money(a.spend)],
                    ["Reach", num(a.reach)],
                    ["Clicks", num(a.clicks)],
                    ["Meta leads", num(a.metaLeads)],
                    ["CRM leads", num(a.leads)],
                    ["Cost / lead", a.leads ? money(a.spend / a.leads) : a.metaLeads ? money(a.spend / a.metaLeads) : "—"],
                    ["Booked", num(a.booked)],
                    ["Orders", num(a.ordered)],
                    ["Revenue", money(a.revenueCents, { cents: true })],
                  ] as const).map(([k, v]) => (
                    <div key={k}><dt className="text-[11px] text-stone">{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
