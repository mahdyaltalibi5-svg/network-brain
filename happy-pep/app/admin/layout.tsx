import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "./actions";
import { AdminNav } from "@/components/admin/nav";

export const metadata: Metadata = { title: "Admin · Happy Pep", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F5F6FA] font-sans text-[#0B0F2E]">
      <header className="sticky top-0 z-30 border-b border-[#E6E8F0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-lg font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-pep-blue" aria-hidden>
              <svg viewBox="0 0 100 32" className="w-5">
                <path d="M7 7 Q50 36 93 7" stroke="#3EF5B9" strokeWidth="14" strokeLinecap="round" fill="none" />
              </svg>
            </span>
            <span className="hidden sm:inline">happy pep</span> <span className="hidden text-sm font-medium text-[#8A8FA3] sm:inline">admin</span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank" className="hidden rounded-lg px-3 py-1.5 text-sm text-[#6B7085] hover:bg-[#F0F2F8] sm:block">
              View store ↗
            </Link>
            <form action={logout}>
              <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[#6B7085] hover:bg-[#F0F2F8]">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
