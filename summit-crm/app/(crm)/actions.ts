"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addNote, moveLead, updateContact, upsertLead } from "@/lib/leads";
import { parseMoney } from "@/lib/format";
import { isStage } from "@/lib/stages";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function moveLeadAction(form: FormData) {
  const id = text(form, "id");
  const to = text(form, "stage");
  if (!id || !isStage(to)) return;
  const valueRaw = text(form, "value");
  await moveLead(id, to, valueRaw ? { valueCents: parseMoney(valueRaw) } : {});
  revalidatePath("/");
  revalidatePath(`/leads/${id}`);
}

export async function addNoteAction(form: FormData) {
  const id = text(form, "id");
  await addNote(id, text(form, "note"));
  revalidatePath(`/leads/${id}`);
}

export async function updateContactAction(form: FormData) {
  const id = text(form, "id");
  await updateContact(id, {
    fullName: text(form, "fullName"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    occasion: text(form, "occasion"),
  });
  revalidatePath(`/leads/${id}`);
  revalidatePath("/");
}

export async function createLeadAction(form: FormData) {
  const name = text(form, "fullName");
  if (!name) return;
  const { lead } = await upsertLead({
    source: "manual",
    fullName: name,
    email: text(form, "email") || undefined,
    phone: text(form, "phone") || undefined,
    occasion: text(form, "occasion") || undefined,
    notes: text(form, "notes") || undefined,
  });
  redirect(`/leads/${lead.id}`);
}
