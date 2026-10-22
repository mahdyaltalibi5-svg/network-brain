import { isAdmin } from "@/lib/admin-auth";
import { listOrders } from "@/lib/orders";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Quote, and neutralize spreadsheet formulas in customer-entered text.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const orders = await listOrders();
  const head = ["id", "created_at", "status", "name", "email", "phone", "address", "city", "state", "zip", "zone", "items", "vials", "subtotal", "discount", "shipping", "total", "source", "campaign", "tracking", "notes"];
  const rows = orders.map((o) =>
    [o.id, o.created_at, o.status, o.name, o.email, o.phone, o.address, o.city, o.state, o.zip, o.zone, o.items.map((i) => `${i.qty}x ${i.name} ${i.size}`).join("; "), o.vials, o.subtotal, o.discount, o.shipping, o.total, o.source, o.campaign, o.tracking, o.notes]
      .map(cell)
      .join(","),
  );
  return new Response([head.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="happy-pep-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
