import { syncAds } from "./ads-sync";
import { pollLeads } from "./connect";

/**
 * Keeps Meta data fresh with no scheduler to set up: called after each CRM page load (and by the
 * daily job). Both parts are throttled (form leads every 4 minutes, ad results hourly) and never
 * throw, so a Meta hiccup can't break a page.
 */
export async function autoSync() {
  const out: { leads?: unknown; ads?: unknown; error?: string } = {};
  try {
    out.leads = await pollLeads();
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  try {
    out.ads = await syncAds();
  } catch (e) {
    out.error = [out.error, e instanceof Error ? e.message : String(e)].filter(Boolean).join("; ");
  }
  return out;
}
