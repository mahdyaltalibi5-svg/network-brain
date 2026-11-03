import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { config } from "@/lib/config";
import { money, num } from "@/lib/format";
import { funnelByCampaign } from "@/lib/leads";
import { DATE_PRESETS, fetchCampaignSpend, isDatePreset, joinCampaigns, presetRange, type CampaignSpend, type DatePreset } from "@/lib/meta/insights";

export const metadata: Metadata = { title: "Meta ads" };

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await connection();
  const { range } = await searchParams;
  const preset: DatePreset = isDatePreset(range) ? range : "last_30d";
  const { since, until } = presetRange(preset);
  const connected = !!(config.meta.adAccountId() && config.meta.adsToken());

  let spend: CampaignSpend[] = [];
  let error: string | null = null;
  if (connected) {
    try {
      spend = await fetchCampaignSpend(preset);
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
            Spend comes from the Meta ad account. Leads, bookings and orders come from this CRM, matched by campaign, for leads that arrived in the same period.
          </p>
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
          Ad spend isn&rsquo;t connected yet, so costs show as $0. Add <code>META_AD_ACCOUNT_ID</code> and <code>META_ADS_ACCESS_TOKEN</code>: see{" "}
          <Link href="/settings" className="text-gold underline">Settings</Link>.
        </p>
      )}
      {error && (
        <p role="alert" className="card mt-6 p-4 text-sm text-bad">
          Meta returned an error: {error}
        </p>
      )}

      <dl className="mt-8 grid gap-px border border-line-soft bg-line-soft sm:grid-cols-3 lg:grid-cols-6">
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
          <div key={k} className="bg-void p-5">
            <dt className="text-xs text-stone">{k}</dt>
            <dd className="mt-1 font-display text-3xl">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Campaign performance</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-stone">
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
              <tr key={r.campaignId} className="border-b border-line-soft">
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
    </>
  );
}
