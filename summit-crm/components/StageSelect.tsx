"use client";

import { useRef } from "react";
import { stages, type StageId } from "@/lib/stages";

/**
 * Stage picker that saves as soon as it changes. Moving to "Order placed" asks for the order
 * value first, because Meta optimises on it. Without JavaScript, the Save button submits.
 */
export function StageSelect({ id, stage, valueCents, action, compact = false }: {
  id: string;
  stage: StageId;
  valueCents?: number | null;
  action: (form: FormData) => Promise<void>;
  compact?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const value = useRef<HTMLInputElement>(null);
  return (
    <form ref={form} action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input ref={value} type="hidden" name="value" defaultValue={valueCents != null ? String(valueCents / 100) : ""} />
      <label className="sr-only" htmlFor={`stage-${id}`}>
        Stage
      </label>
      <select
        id={`stage-${id}`}
        name="stage"
        defaultValue={stage}
        className={compact ? "field !w-auto !px-2 !py-1 text-xs" : "field"}
        onChange={(e) => {
          if (e.currentTarget.value === "ordered" && value.current) {
            const v = window.prompt("Order value in USD (for Meta's return-on-ad-spend):", value.current.value);
            if (v === null) {
              e.currentTarget.value = stage;
              return;
            }
            value.current.value = v;
          }
          form.current?.requestSubmit();
        }}
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn-ghost !px-2 !py-1">
          Save
        </button>
      </noscript>
    </form>
  );
}
