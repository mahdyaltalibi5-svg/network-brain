import { cookies } from "next/headers";
import { BASE } from "@/lib/base";
import { config } from "@/lib/config";
import { loginUrl } from "@/lib/meta/connect";

const STATE_COOKIE = "meta_oauth_state";

/** Starts "Connect with Facebook" (signed-in only, see proxy.ts). */
export async function GET() {
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  (await cookies()).set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: BASE, maxAge: 600 });
  try {
    return Response.redirect(await loginUrl(state), 302);
  } catch (e) {
    const u = new URL(`${config.publicUrl()}/settings`);
    u.searchParams.set("meta", e instanceof Error ? e.message : String(e));
    u.hash = "meta";
    return Response.redirect(u.toString(), 302);
  }
}
