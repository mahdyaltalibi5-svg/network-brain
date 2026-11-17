"use client";

import { useActionState } from "react";
import { Rocket, Undo2 } from "lucide-react";
import { publishAgentAction, undoChangeAction, type AgentActionState } from "@/app/(crm)/website/actions";
import type { SiteChange } from "@/lib/site";
import { ChangeStatus } from "./WebsiteForm";

export function AgentPublish({ id, siteUrl }: { id: string; siteUrl: string }) {
  const [state, action, pending] = useActionState<AgentActionState, FormData>(publishAgentAction, {});
  if (state.change) return <ChangeStatus key={state.change.id} initial={state.change} siteUrl={siteUrl} />;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <button className="btn w-full sm:w-auto" disabled={pending}>
        <Rocket className="h-4 w-4" aria-hidden="true" />
        {pending ? "Publishing…" : "Publish to the website"}
      </button>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
    </form>
  );
}

export function PublishedStatus({ change, siteUrl, canUndo }: { change: SiteChange; siteUrl: string; canUndo: boolean }) {
  const [state, action, pending] = useActionState<AgentActionState, FormData>(undoChangeAction, {});
  return (
    <div className="space-y-3">
      <ChangeStatus initial={change} siteUrl={siteUrl} />
      {state.change ? (
        <ChangeStatus key={state.change.id} initial={state.change} siteUrl={siteUrl} />
      ) : (
        canUndo && (
          <form action={action}>
            <input type="hidden" name="change" value={change.id} />
            <button className="btn-ghost" disabled={pending}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              {pending ? "Undoing…" : "Undo this change"}
            </button>
            {state.error && <p role="alert" className="mt-2 text-sm text-bad">{state.error}</p>}
          </form>
        )
      )}
    </div>
  );
}
