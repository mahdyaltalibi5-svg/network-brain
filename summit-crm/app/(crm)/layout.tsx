import Link from "next/link";
import { logout } from "../login/actions";
import { Nav } from "@/components/Nav";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line-soft bg-void/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <svg aria-hidden="true" viewBox="0 0 32 20" className="h-4 w-7">
              <path d="M1 19 L10 5 L14 10 L19 3 L31 19" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-semibold tracking-[0.28em] uppercase">
              Summit <span className="text-gold">CRM</span>
            </span>
          </Link>
          <Nav />
          <form action={logout} className="ml-auto">
            <button type="submit" className="text-xs text-stone hover:text-ivory">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
