// Real reviews only. Copy them in from Google or Trustpilot (with the source
// link) once you have them. The reviews section stays hidden while this is empty.
export type Review = { name: string; text: string; rating: number; source: "Google" | "Trustpilot"; url: string };

export const reviews: Review[] = [];
