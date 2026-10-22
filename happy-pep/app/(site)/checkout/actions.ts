"use server";

import { hasDb } from "@/lib/db";
import { createOrder, type NewOrder } from "@/lib/orders";
import { startPayment } from "@/lib/checkout";

export type PlaceOrderResult = { ok: true; orderId: string; paymentUrl: string | null } | { ok: false; error: string };

export async function placeOrder(input: NewOrder): Promise<PlaceOrderResult> {
  if (!hasDb()) return { ok: false, error: "Checkout isn't live yet. Please check back soon." };
  try {
    const res = await createOrder(input);
    if ("error" in res) return { ok: false, error: res.error };
    const paymentUrl = await startPayment(res.order);
    return { ok: true, orderId: res.order.id, paymentUrl };
  } catch (err) {
    console.error("placeOrder failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
