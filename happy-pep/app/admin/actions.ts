"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { credentialsMatch, endSession, requireAdmin, startSession } from "@/lib/admin-auth";
import { deleteOrder, setNotes, setStatus } from "@/lib/orders";
import { STATUSES, type OrderStatus } from "@/lib/order-types";

export async function login(_: unknown, form: FormData) {
  if (!credentialsMatch(String(form.get("email") ?? ""), String(form.get("password") ?? ""))) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Wrong email or password." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function updateOrderStatus(id: string, status: OrderStatus, tracking?: string) {
  await requireAdmin();
  if (!STATUSES.includes(status)) return;
  await setStatus(String(id), status, tracking === undefined ? undefined : String(tracking).slice(0, 120));
  revalidatePath("/admin", "layout");
}

export async function removeOrder(id: string) {
  await requireAdmin();
  await deleteOrder(String(id));
  revalidatePath("/admin", "layout");
}

export async function updateOrderNotes(id: string, notes: string) {
  await requireAdmin();
  await setNotes(String(id), String(notes));
  revalidatePath("/admin", "layout");
}
