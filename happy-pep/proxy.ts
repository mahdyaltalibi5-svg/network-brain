import { NextResponse, type NextRequest } from "next/server";

// The admin dashboard lives on its own subdomain: admin.happypep.shop/ serves
// /admin, and /admin on the store domain redirects there.
const ADMIN_HOST = process.env.ADMIN_HOST ?? "admin.happypep.shop";
const STORE_DOMAIN = ADMIN_HOST.replace(/^admin\./, "");

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;

  if (host === ADMIN_HOST) {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  if ((host === STORE_DOMAIN || host === `www.${STORE_DOMAIN}`) && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return NextResponse.redirect(new URL(pathname.replace(/^\/admin/, "") || "/", `https://${ADMIN_HOST}`));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static files (anything with a file extension).
  matcher: ["/((?!_next/|_vercel/|.*\\.[\\w]+$).*)"],
};
