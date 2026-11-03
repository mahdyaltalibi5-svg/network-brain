"use server";

import { revalidatePath } from "next/cache";
import { upsertLead } from "@/lib/leads";
import { leadsFromExport } from "@/lib/meta/csv";

export type ImportState = { message?: string; ok?: boolean };

export async function importLeadsAction(_: ImportState, form: FormData): Promise<ImportState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose the file you downloaded from Meta first." };
  if (file.size > 5_000_000) return { ok: false, message: "That file is over 5 MB. Download a shorter date range." };
  const { leads, skipped } = leadsFromExport(new Uint8Array(await file.arrayBuffer()));
  if (!leads.length) return { ok: false, message: "No Meta leads found in that file. Is it the lead download from Ads Manager or Leads Center?" };
  let created = 0;
  for (const l of leads) if ((await upsertLead(l)).created) created++;
  revalidatePath("/");
  const dupes = leads.length - created;
  return {
    ok: true,
    message: `Imported ${created} new lead${created === 1 ? "" : "s"}${dupes ? `; ${dupes} already in the CRM` : ""}${skipped ? `; ${skipped} row${skipped === 1 ? "" : "s"} skipped (no lead ID)` : ""}.`,
  };
}
