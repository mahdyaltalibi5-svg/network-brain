import { Suspense } from "react";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { LoginForm } from "@/components/admin/login-form";

async function Login() {
  if (await isAdmin()) redirect("/admin");
  if (!adminConfigured()) {
    return <p className="text-sm text-[#6B7085]">Set the <code className="rounded bg-[#F0F2F8] px-1">ADMIN_PASSWORD</code> environment variable in Vercel, then redeploy.</p>;
  }
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-3xl bg-white p-8 shadow-[0_10px_40px_-20px_rgba(11,15,46,0.25)]">
      <h1 className="font-display text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-[#6B7085]">Happy Pep admin dashboard</p>
      <div className="mt-6">
        <Suspense>
          <Login />
        </Suspense>
      </div>
    </div>
  );
}
