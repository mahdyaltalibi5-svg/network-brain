import { config } from "@/lib/config";
import { upsertLead } from "@/lib/leads";

/**
 * Website lead intake. The booking page on summitcustomsuits.com posts here, so website
 * enquiries land in the same pipeline as Meta leads. CORS is limited to CRM_ALLOWED_ORIGINS.
 * Fields: name, email, phone, occasion, notes, plus fbc/fbp (Meta click and browser IDs) when
 * the page has them, which lets Meta match the later stage events to the ad that was clicked.
 */
function cors(origin: string | null) {
  const allowed = origin && config.allowedOrigins().includes(origin) ? origin : null;
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed, Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request.headers.get("origin")) });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = cors(origin);
  if (origin && !config.allowedOrigins().includes(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers });

  let body: Record<string, unknown>;
  try {
    const type = request.headers.get("content-type") ?? "";
    body = type.includes("application/json")
      ? ((await request.json()) as Record<string, unknown>)
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400, headers });
  }

  // Honeypot: real visitors never fill the hidden "company" field.
  if (str(body.company, 200)) return Response.json({ ok: true }, { headers });

  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const name = str(body.name, 120);
  if (!name || (!email && !phone)) return Response.json({ error: "Name and an email or phone are required" }, { status: 422, headers });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Invalid email" }, { status: 422, headers });

  const { lead } = await upsertLead({
    source: "website",
    fullName: name,
    email,
    phone,
    occasion: str(body.occasion, 120),
    notes: str(body.notes, 4000),
    fbc: str(body.fbc, 300),
    fbp: str(body.fbp, 300),
  });
  return Response.json({ ok: true, id: lead.id }, { status: 201, headers });
}
