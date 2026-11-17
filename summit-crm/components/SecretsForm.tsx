"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { saveSecretAction, type SecretState } from "@/app/(crm)/website/actions";

/** Paste one API key; it's stored encrypted and never shown again. */
export function SecretField({ name, label, saved, help }: { name: string; label: string; saved: boolean; help: React.ReactNode }) {
  const [state, action, pending] = useActionState<SecretState, FormData>(saveSecretAction, {});
  const ok = saved || !!state.ok;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="name" value={name} />
      <label htmlFor={`secret-${name}`} className="flex items-center gap-2 font-medium">
        {label}
        {ok && <span className="inline-flex items-center gap-1 text-xs text-ok"><Check className="h-3.5 w-3.5" aria-hidden="true" />saved</span>}
      </label>
      <p className="text-sm text-ivory-dim">{help}</p>
      <div className="flex gap-2">
        <input id={`secret-${name}`} name="value" type="password" autoComplete="off" required placeholder={ok ? "Paste a new one to replace it" : "Paste it here"} className="field" />
        <button className="btn-ghost shrink-0" disabled={pending}>{pending ? "Checking…" : "Save"}</button>
      </div>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
    </form>
  );
}
