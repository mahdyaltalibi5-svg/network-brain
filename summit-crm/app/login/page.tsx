import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="glass w-full max-w-sm !rounded-[28px] p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#2a2620] to-[#0e0d0b] ring-1 ring-gold/40 shadow-[0_0_30px_rgba(201,164,92,.35)]">
          <svg aria-hidden="true" viewBox="0 0 32 20" className="h-4 w-7">
            <path d="M1 19 L10 5 L14 10 L19 3 L31 19" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="eyebrow mt-6">Summit Customs</p>
        <h1 className="mt-2 font-display text-4xl">Client portal</h1>
        <p className="mt-2 text-sm text-ivory-dim">Leads, speed to lead and the website, in one place.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
