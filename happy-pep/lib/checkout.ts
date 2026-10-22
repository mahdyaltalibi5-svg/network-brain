import "server-only";
import type { Order } from "./order-types";

// Connect your payment processor here. Create a hosted payment session for
// `order` (charge `order.total`, which already includes stack savings and
// shipping) and return its URL. Point the processor's success redirect at
// /checkout/success and its webhook at a route that calls markPaid(order.id)
// from lib/orders.ts. Returns null while no processor is connected.
export async function startPayment(order: Order): Promise<string | null> {
  void order;
  return null;
}
