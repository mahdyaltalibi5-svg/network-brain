"use client";

import { useActionState } from "react";
import { saveAppAction, type AppState } from "@/app/(crm)/settings/actions";

export function MetaAppForm({ appId, configId, hasSecret }: { appId?: string; configId?: string; hasSecret?: boolean }) {
  const [state, action, pending] = useActionState<AppState, FormData>(saveAppAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="meta-app-id">App ID</label>
        <input id="meta-app-id" name="appId" inputMode="numeric" autoComplete="off" defaultValue={appId} required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="meta-app-secret">App secret</label>
        <input id="meta-app-secret" name="appSecret" type="password" autoComplete="off" className="field" placeholder={hasSecret ? "Saved. Paste again to change it" : "Paste it here"} />
      </div>
      <div>
        <label className="label" htmlFor="meta-config-id">Configuration ID</label>
        <input id="meta-config-id" name="configId" inputMode="numeric" autoComplete="off" defaultValue={configId} className="field" placeholder="From step 1" />
      </div>
      <button className="btn" disabled={pending}>{pending ? "Checking…" : "Save app"}</button>
      {state.error && <p role="alert" className="text-sm text-bad sm:col-span-4">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-ok sm:col-span-4">{state.ok}</p>}
    </form>
  );
}
