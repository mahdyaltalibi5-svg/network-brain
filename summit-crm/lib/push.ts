import { sendNotification } from "web-push";
import { config } from "./config";
import { getDb } from "./db";

/**
 * Web Push: lead alerts on Kobe's phone (the CRM installed to the home screen) and laptop.
 * No third-party service: the browser's push service delivers, signed with our VAPID keys.
 */
export type PushPayload = { title: string; body: string; url?: string; tag?: string };
export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };

export const pushReady = () => !!(config.push.publicKey() && config.push.privateKey());

export async function saveSubscription(sub: PushSub, label?: string) {
  const db = await getDb();
  await db.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, label) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, label = EXCLUDED.label`,
    [sub.endpoint, sub.keys.p256dh, sub.keys.auth, label ?? null],
  );
}

export async function removeSubscription(endpoint: string) {
  const db = await getDb();
  await db.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
}

/** Devices with alerts on: a label (Phone / Computer + browser) and when they were added. */
export async function subscriptions() {
  const db = await getDb();
  return (await db.query<{ label: string | null; created_at: unknown; endpoint: string }>(`SELECT label, created_at, endpoint FROM push_subscriptions ORDER BY created_at`)).map((r) => ({
    label: r.label ?? "Device",
    service: /apple\.com/.test(r.endpoint) ? "iPhone / Safari" : /fcm\.googleapis|google/.test(r.endpoint) ? "Chrome / Android" : /mozilla/.test(r.endpoint) ? "Firefox" : /windows|notify\.windows/.test(r.endpoint) ? "Edge" : "Browser",
    added: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  }));
}

export async function subscriptionCount() {
  const db = await getDb();
  return Number((await db.query(`SELECT count(*)::int AS n FROM push_subscriptions`))[0].n);
}

/** Sends to every registered device. Expired subscriptions (404/410) are removed. Never throws. */
export async function notifyAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!pushReady()) return { sent: 0, failed: 0 };
  const db = await getDb();
  const subs = await db.query<{ endpoint: string; p256dh: string; auth: string }>(`SELECT endpoint, p256dh, auth FROM push_subscriptions`);
  const body = JSON.stringify(payload);
  let sent = 0, failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          vapidDetails: { subject: config.push.subject(), publicKey: config.push.publicKey()!, privateKey: config.push.privateKey()! },
          TTL: 60 * 60,
          urgency: "high",
          topic: payload.tag?.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, ""),
        });
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await removeSubscription(s.endpoint);
        else console.error("push failed", status, e instanceof Error ? e.message : e);
      }
    }),
  );
  return { sent, failed };
}
