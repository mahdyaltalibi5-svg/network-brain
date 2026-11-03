/**
 * The sales pipeline. Each stage change is sent to Meta (Conversions API for CRM) under its
 * `metaEvent` name, so campaigns can optimise for the stage that matters (booked or ordered),
 * not just for form fills. Keep names stable once events are flowing: Meta keys on them.
 */
export const stages = [
  { id: "new", label: "New lead", metaEvent: "Lead", hint: "Just arrived. Reply within the hour." },
  { id: "contacted", label: "Contacted", metaEvent: "Contacted", hint: "Reached by phone, text or email." },
  { id: "booked", label: "Consultation booked", metaEvent: "Consultation Booked", hint: "Time agreed." },
  { id: "consulted", label: "Consultation held", metaEvent: "Consultation Held", hint: "Met in person or by video." },
  { id: "ordered", label: "Order placed", metaEvent: "Purchase", hint: "Deposit taken. Record the order value." },
  { id: "delivered", label: "Delivered", metaEvent: "Delivered", hint: "Final fitting done, garment handed over." },
  { id: "lost", label: "Lost", metaEvent: "Disqualified", hint: "Not a fit, or went elsewhere." },
] as const;

export type StageId = (typeof stages)[number]["id"];
export const stageIds = stages.map((s) => s.id) as StageId[];
export const isStage = (v: unknown): v is StageId => typeof v === "string" && (stageIds as string[]).includes(v);
export const stage = (id: StageId) => stages.find((s) => s.id === id)!;

/** Reaching these stages stamps booked_at / ordered_at, so reporting survives a later "lost". */
export const bookedStages: StageId[] = ["booked", "consulted", "ordered", "delivered"];
export const orderedStages: StageId[] = ["ordered", "delivered"];
