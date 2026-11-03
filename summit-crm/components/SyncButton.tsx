"use client";

import { useState } from "react";

/** Runs the Meta lead sync on demand and reports what it imported. */
export function SyncButton({ disabled }: { disabled?: boolean }) {
  const [state, setState] = useState<{ busy: boolean; msg?: string; ok?: boolean }>({ busy: false });
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        className="btn"
        disabled={disabled || state.busy}
        onClick={async () => {
          setState({ busy: true });
          const res = await fetch("/api/meta/sync?days=30");
          const j = (await res.json().catch(() => ({}))) as { ok?: boolean; fetched?: number; created?: number; error?: string };
          setState({
            busy: false,
            ok: !!j.ok,
            msg: j.ok ? `Checked ${j.fetched} leads from the last 30 days; ${j.created} new.` : `Sync failed: ${j.error ?? res.statusText}`,
          });
        }}
      >
        {state.busy ? "Syncing…" : "Sync Meta leads now"}
      </button>
      {state.msg && (
        <p role="status" className={`text-sm ${state.ok ? "text-ok" : "text-bad"}`}>
          {state.msg}
        </p>
      )}
    </div>
  );
}
