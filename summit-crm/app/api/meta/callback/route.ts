import { cookies } from "next/headers";
import { safeEqual } from "@/lib/auth";
import { BASE } from "@/lib/base";
import { config } from "@/lib/config";
import { completeConnect } from "@/lib/meta/connect";

/** Facebook Login comes back here with ?code=…&state=… */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const jar = await cookies();
  const expected = jar.get("meta_oauth_state")?.value;
  jar.set("meta_oauth_state", "", { path: BASE, maxAge: 0 });
  const back = (meta: string) => {
    const u = new URL(`${config.publicUrl()}/settings`);
    u.searchParams.set("meta", meta);
    u.hash = "meta";
    return Response.redirect(u.toString(), 302);
  };
  if (p.get("error")) return back(p.get("error_description") ?? "Facebook login was cancelled");
  const code = p.get("code");
  const state = p.get("state") ?? "";
  if (!code || !expected || !(await safeEqual(state, expected))) return back("The login link expired. Click Connect again.");
  try {
    const r = await completeConnect(code);
    return back(r.ok ? "connected" : "partial");
  } catch (e) {
    return back(e instanceof Error ? e.message : String(e));
  }
}
