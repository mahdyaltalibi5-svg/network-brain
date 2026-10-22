import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { hasDb } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { OrdersView } from "@/components/admin/orders";
import { SetupNotice } from "@/components/admin/setup";

async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; open?: string }> }) {
  await requireAdmin();
  if (!hasDb()) return <SetupNotice />;
  const [orders, params] = await Promise.all([listOrders(), searchParams]);
  return <OrdersView orders={orders} initialStatus={params.status ?? "all"} initialOpen={params.open ?? null} />;
}

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-sm text-[#8A8FA3]">Loading orders…</p>}>
      <Orders searchParams={searchParams as Promise<{ status?: string; open?: string }>} />
    </Suspense>
  );
}
