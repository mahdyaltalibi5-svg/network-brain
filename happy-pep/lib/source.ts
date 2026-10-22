// First-touch attribution: remembers where a visitor came from (TikTok ad,
// Google, etc.) so orders can be grouped by source in the admin dashboard.
const KEY = "hp_src";

export function captureSource() {
  try {
    if (localStorage.getItem(KEY)) return;
    const q = new URLSearchParams(location.search);
    const ref = document.referrer;
    const source =
      q.get("utm_source") ||
      (q.get("ttclid") ? "tiktok" : "") ||
      (/tiktok\./.test(ref) ? "tiktok" : /google\./.test(ref) ? "google" : /instagram\.|facebook\./.test(ref) ? "meta" : ref ? "referral" : "direct");
    localStorage.setItem(KEY, JSON.stringify({ source, campaign: q.get("utm_campaign") ?? "" }));
  } catch {}
}

export function getSource(): { source: string; campaign: string } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v?.source) return { source: String(v.source), campaign: String(v.campaign ?? "") };
  } catch {}
  return { source: "direct", campaign: "" };
}
