import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <p className="eyebrow">Summit Customs</p>
        <h1 className="mt-3 font-display text-4xl">Client pipeline</h1>
        <p className="mt-2 text-sm text-ivory-dim">Sign in to see leads from Meta ads and the website.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
