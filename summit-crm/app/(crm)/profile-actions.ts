"use server";

import { revalidatePath } from "next/cache";
import { parseMoney } from "@/lib/format";
import { completeFollowUp, setFollowUp } from "@/lib/followups";
import { addFile, addGarment, deleteFile, deleteGarment, MAX_FILE, saveDetails, saveMeasurements, savePreferences, setGarmentStatus } from "@/lib/profile";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const refresh = (id: string) => {
  revalidatePath(`/leads/${id}`);
  revalidatePath("/", "layout");
};

/** `at` arrives as an ISO string from the browser (converted from Kobe's local time there). */
export async function setFollowUpAction(form: FormData) {
  const id = text(form, "id");
  const at = new Date(text(form, "at"));
  if (!id || Number.isNaN(at.getTime())) return;
  await setFollowUp(id, at, text(form, "note"));
  refresh(id);
}

export async function completeFollowUpAction(form: FormData) {
  const id = text(form, "id");
  await completeFollowUp(id);
  refresh(id);
}

export async function saveDetailsAction(form: FormData) {
  const id = text(form, "id");
  await saveDetails(id, { eventDate: text(form, "eventDate") || null, eventLabel: text(form, "eventLabel") || null, valueCents: parseMoney(text(form, "value")) });
  refresh(id);
}

export async function saveMeasurementsAction(form: FormData) {
  const id = text(form, "id");
  await saveMeasurements(id, Object.fromEntries(form.entries()));
  refresh(id);
}

export async function savePreferencesAction(form: FormData) {
  const id = text(form, "id");
  await savePreferences(id, Object.fromEntries(form.entries()));
  refresh(id);
}

export async function addGarmentAction(form: FormData) {
  const id = text(form, "id");
  await addGarment(id, { kind: text(form, "kind"), fabric: text(form, "fabric"), details: text(form, "details"), priceCents: parseMoney(text(form, "price")), dueDate: text(form, "due") || null });
  refresh(id);
}

export async function garmentStatusAction(form: FormData) {
  await setGarmentStatus(text(form, "garment"), text(form, "status"));
  refresh(text(form, "id"));
}

export async function deleteGarmentAction(form: FormData) {
  await deleteGarment(text(form, "garment"));
  refresh(text(form, "id"));
}

export type UploadState = { error?: string; ok?: number };

export async function uploadFilesAction(_: UploadState, form: FormData): Promise<UploadState> {
  const id = text(form, "id");
  const list = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!list.length) return { error: "Choose a photo or file first." };
  for (const f of list) {
    if (f.size > MAX_FILE) return { error: `${f.name} is over 4 MB. Photos are shrunk automatically; for PDFs, export a smaller copy.` };
    await addFile(id, { name: f.name, mime: f.type, bytes: new Uint8Array(await f.arrayBuffer()) });
  }
  refresh(id);
  return { ok: list.length };
}

export async function deleteFileAction(form: FormData) {
  await deleteFile(text(form, "file"));
  refresh(text(form, "id"));
}
