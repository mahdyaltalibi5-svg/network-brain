/** Anatomy of a bespoke jacket. General tailoring knowledge, written to be quotable. */
export type AnatomyPart = { id: string; name: string; fact: string; detail: string };

export const anatomy: AnatomyPart[] = [
  {
    id: "canvas",
    name: "The Canvas",
    fact: "Full canvas, half canvas or fused",
    detail:
      "A layer of wool and horsehair between the cloth and the lining gives the jacket its shape. A full canvas runs the whole front and floats free, so it moulds to your chest over time. A half canvas covers the chest and lapel. A fused front is glued, which is cheaper and flatter, and can blister after dry cleaning.",
  },
  {
    id: "lapel",
    name: "The Lapel",
    fact: "Notch, peak or shawl, with a hand-padded roll",
    detail:
      "Lapel width should follow your shoulders and face. Around 3 to 3¾ inches suits most frames. Padding the lapel by hand with hundreds of small stitches gives it a soft, three-dimensional roll instead of a pressed-flat crease.",
  },
  {
    id: "shoulder",
    name: "The Shoulder",
    fact: "The one part that can't be altered later",
    detail:
      "The shoulder sets how a jacket hangs. It can be soft and natural, or built up with a light pad and roped sleeve head. It is cut to your own shoulder slope, which is why off-the-rack jackets so often fail here first.",
  },
  {
    id: "buttons",
    name: "Buttons & Stance",
    fact: "The top button sets your waistline",
    detail:
      "Button stance, the height of the fastening button, defines where the eye reads your waist. Setting it slightly above the natural waist lengthens the leg line. Horn, corozo and mother-of-pearl are the classic materials.",
  },
  {
    id: "pockets",
    name: "Pockets",
    fact: "Flap, jetted or patch, by formality",
    detail:
      "Jetted pockets are the most formal and suit dinner and wedding suits. Flap pockets are the business standard. Patch pockets relax a jacket for odd jackets and weekend tailoring. A ticket pocket adds a Savile Row accent.",
  },
  {
    id: "lining",
    name: "The Lining",
    fact: "Cupro breathes; polyester doesn't",
    detail:
      "Bemberg cupro, a regenerated cotton fibre, wicks moisture and slides on and off smoothly. That matters in a dry Utah summer. Half or quarter linings lighten warm-weather jackets further.",
  },
];
