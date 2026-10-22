export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-8">
      <h1 className="font-display text-2xl font-semibold">Connect a database</h1>
      <p className="mt-2 text-[#6B7085]">Orders are stored in Postgres. To turn the dashboard on:</p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#0B0F2E]">
        <li>In Vercel, open the happy-pep project → Storage → Create Database → Neon (Postgres), free tier.</li>
        <li>Connect it to the project. Vercel adds <code className="rounded bg-[#F0F2F8] px-1">DATABASE_URL</code> automatically.</li>
        <li>Redeploy. The orders table is created on the first request.</li>
      </ol>
    </div>
  );
}
