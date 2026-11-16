"use server";

import { revalidatePath } from "next/cache";
import { publish, type SiteChange, type SiteSettings } from "@/lib/site";

export type PublishState = { errors?: string[]; change?: SiteChange };

export async function publishAction(_: PublishState, form: FormData): Promise<PublishState> {
  const v = (k: string) => String(form.get(k) ?? "");
  const settings: SiteSettings = {
    announcement: { enabled: form.get("annOn") === "on", text: v("annText"), link: v("annLink"), linkText: v("annLinkText") },
    phone: v("phone"),
    email: v("email"),
    hours: { days: v("days"), daysShort: v("daysShort"), open: v("open"), close: v("close") },
  };
  try {
    const r = await publish(settings);
    revalidatePath("/website");
    return r.ok ? { change: r.change } : { errors: r.errors };
  } catch (e) {
    return { errors: [e instanceof Error ? e.message : String(e)] };
  }
}
