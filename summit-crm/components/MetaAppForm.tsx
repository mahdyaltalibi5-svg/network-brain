"use client";

import { useActionState } from "react";
import { saveAppAction, type AppState } from "@/app/(crm)/settings/actions";

export function MetaAppForm({ appId }: { appId?: string }) {
  const [state, action, pending] = useActionState<AppState, FormData>(saveAppAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="meta-app-id">App ID</label>
        <input id="meta-app-id" name="appId" inputMode="numeric" autoComplete="off" defaultValue={appId} required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="meta-app-secret">App secret</label>
        <input id="meta-app-secret" name="appSecret" type="password" autoComplete="off" required className="field" placeholder={appId ? "Saved. Paste again to change it" : ""} />
      </div>
      <button className="btn" disabled={pending}>{pending ? "Checking…" : "Save app"}</button>
      {state.error && <p role="alert" className="text-sm text-bad sm:col-span-3">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-ok sm:col-span-3">{state.ok}</p>}
    </form>
  );
}
