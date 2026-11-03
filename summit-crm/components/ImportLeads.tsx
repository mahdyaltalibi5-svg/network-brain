"use client";

import { useActionState } from "react";
import { importLeadsAction, type ImportState } from "@/app/(crm)/import-actions";

/** Upload the lead file downloaded from Meta (CSV or Ads Manager's tab-separated export). */
export function ImportLeads() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importLeadsAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <label htmlFor="import-file" className="sr-only">
        Meta lead file
      </label>
      <input id="import-file" name="file" type="file" accept=".csv,.tsv,.txt,text/csv" required className="field !w-auto max-w-full text-sm" />
      <button className="btn" disabled={pending}>
        {pending ? "Importing…" : "Import leads"}
      </button>
      {state.message && (
        <p role="status" className={`w-full text-sm ${state.ok ? "text-ok" : "text-bad"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
