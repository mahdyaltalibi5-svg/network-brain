import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Everything is private except sign-in and the endpoints Meta, Vercel Cron and the website call. */
const PUBLIC = [
  /^\/login$/, /^\/api\/meta\/webhook$/, /^\/api\/meta\/sync$/, /^\/api\/leads$/, /^\/api\/health$/, /^\/api\/speed\/nudge$/, /^\/api\/speed\/tick$/,
  // installable app: the manifest, service worker and icons load without a session
  /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/icons\//, /^\/apple-icon/,
];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();
  const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, process.env.CRM_SESSION_SECRET);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const login = request.nextUrl.clone(); // keeps the /portal base path
  login.pathname = "/login";
  login.search = "";
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // "/" listed on its own: with basePath, the base itself (/portal) isn't matched by the pattern alone.
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
