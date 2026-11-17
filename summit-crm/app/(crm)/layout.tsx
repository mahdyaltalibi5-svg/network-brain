import Link from "next/link";
import { logout } from "../login/actions";
import { Nav } from "@/components/Nav";
import { after, connection } from "next/server";
import { autoSync } from "@/lib/meta/auto";
import { getDb } from "@/lib/db";

async function waitingCount() {
  await connection();
  try {
    const db = await getDb();
    return Number((await db.query(`SELECT count(*)::int AS n FROM leads WHERE first_contact_at IS NULL AND stage = 'new'`))[0].n);
  } catch {
    return 0;
  }
}

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const waiting = await waitingCount();
  // Pull new Meta form leads and ad results after the page is sent (throttled; never slows it).
  after(() => autoSync());
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 px-3 pt-3 md:px-6 md:pt-4">
        <div className="glass mx-auto flex max-w-[1600px] items-center gap-6 !rounded-full px-4 py-2.5 md:px-6">
          <Link href="/now" className="flex shrink-0 items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-[#2a2620] to-[#0e0d0b] ring-1 ring-gold/40">
              <svg aria-hidden="true" viewBox="0 0 32 20" className="h-3 w-5">
                <path d="M1 19 L10 5 L14 10 L19 3 L31 19" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold tracking-[0.3em] uppercase">
              Summit <span className="text-gold">Portal</span>
            </span>
          </Link>
          <div className="hidden min-w-0 flex-1 md:block">
            <Nav waiting={waiting} />
          </div>
          <form action={logout} className="ml-auto">
            <button type="submit" className="pill hover:text-ivory">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pt-6 pb-28 md:px-6 md:pt-10 md:pb-12">{children}</main>
      <div className="fixed inset-x-3 bottom-3 z-20 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Nav waiting={waiting} mobile />
      </div>
    </div>
  );
}
