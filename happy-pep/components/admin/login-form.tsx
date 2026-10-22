"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3">
      <input
        name="email"
        type="email"
        required
        autoFocus
        autoComplete="username"
        placeholder="Email"
        className="h-12 w-full rounded-xl bg-[#F5F6FA] px-4 outline-none ring-1 ring-[#E6E8F0] focus:ring-2 focus:ring-pep-blue"
      />
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        className="h-12 w-full rounded-xl bg-[#F5F6FA] px-4 outline-none ring-1 ring-[#E6E8F0] focus:ring-2 focus:ring-pep-blue"
      />
      {state?.error && <p className="text-sm font-medium text-[#d03b3b]">{state.error}</p>}
      <button disabled={pending} className="h-12 w-full rounded-xl bg-pep-blue font-semibold text-white disabled:opacity-60">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
