import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { hasDb } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { isRange, rangeBounds, summarize } from "@/lib/analytics";
import { Dashboard } from "@/components/admin/dashboard";
import { SetupNotice } from "@/components/admin/setup";

async function Overview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  if (!hasDb()) return <SetupNotice />;
  const { range } = await searchParams;
  const key = isRange(range) ? range : "30d";
  const { prevFrom } = rangeBounds(key);
  // Pull this period, the previous one (for deltas) and anything still to fulfill.
  const orders = await listOrders();
  const relevant = prevFrom ? orders.filter((o) => new Date(o.created_at) >= prevFrom || o.status === "paid" || o.status === "packed") : orders;
  return <Dashboard data={summarize(relevant, key)} />;
}

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-sm text-[#8A8FA3]">Loading dashboard…</p>}>
      <Overview searchParams={searchParams as Promise<{ range?: string }>} />
    </Suspense>
  );
}
