/**
 * Real client reviews only. Leave `reviews` empty until the client supplies
 * verified reviews (name/initials + permission). AggregateRating and Review
 * schema are emitted ONLY when this array is non-empty and ratingSource is set.
 */
export type ClientReview = {
  author: string;
  role?: string;
  rating: number; // 1–5
  body: string;
  date: string; // ISO date
};

export const reviews: ClientReview[] = [];

/** Where the rating comes from (e.g. "Google Business Profile"). Required to publish ratings. */
export const ratingSource: string | null = null;
