import { ph } from "@/lib/ph";
import { studio } from "@/content/business";

export type ProcessStep = {
  n: number;
  slug: string;
  name: string;
  duration: string;
  summary: string;
  detail: string[];
};

export const processSteps: ProcessStep[] = [
  {
    n: 1,
    slug: "consultation",
    name: "Consultation",
    duration: "60–90 minutes",
    summary:
      "We start with how you work, travel and present, and what the suit needs to do. Then we agree on the style, the occasion and a budget.",
    detail: [
      "Discussion of your role, your calendar and the rooms you walk into.",
      "Style direction: silhouette, lapel, button stance, pocket and trouser details.",
      "An honest view of what bespoke will and won't change for you.",
    ],
  },
  {
    n: 2,
    slug: "measurements",
    name: "Measurements",
    duration: "Taken at the consultation",
    summary:
      "Twenty-plus measurements, plus posture notes a tape measure can't capture: shoulder slope, stance, seat and the way you carry your arms.",
    detail: [
      "Body measurements across chest, waist, seat, rise, arm and back.",
      "Posture analysis: shoulder slope, head and neck carriage, asymmetries.",
      "Your pattern is drafted from these figures, not adjusted from a stock size.",
    ],
  },
  {
    n: 3,
    slug: "fabric",
    name: "Fabric",
    duration: "Same visit or a follow-up",
    summary: `You choose from cloth books from ${studio.mills}, guided by season, weight, Utah's climate and how often you'll wear it.`,
    detail: [
      "Weight guidance: 230–270 g for summer, 270–300 g year-round, 300 g+ for winter.",
      "Lining, buttons (horn, corozo or mother-of-pearl) and thread colours chosen together.",
      "Your quote is confirmed in writing before anything is cut.",
    ],
  },
  {
    n: 4,
    slug: "construction",
    name: "Construction",
    duration: studio.constructionWeeks,
    summary:
      "The pattern is cut and the suit is built in stages, with fittings along the way so the shape is refined on your body rather than on paper.",
    detail: [
      `Construction: ${studio.canvas}.`,
      `Hand details: ${studio.handFinishing}.`,
      `Fittings during construction: ${ph("number of fittings before final, e.g. baste + forward")}.`,
    ],
  },
  {
    n: 5,
    slug: "final-fitting",
    name: "Final Fitting",
    duration: "45 minutes",
    summary:
      "We check balance, sleeve pitch, collar and trouser break in natural light and while you move. Then the suit is pressed and handed over with care instructions.",
    detail: [
      "Last adjustments are made and checked before collection.",
      "Your pattern is archived, so the next commission starts from a proven fit.",
      `Aftercare: ${studio.aftercare}.`,
    ],
  },
];
