import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Everything is private except sign-in and the endpoints Meta, Vercel Cron and the website call. */
const PUBLIC = [/^\/login$/, /^\/api\/meta\/webhook$/, /^\/api\/meta\/sync$/, /^\/api\/leads$/, /^\/api\/health$/];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();
  const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, process.env.CRM_SESSION_SECRET);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
