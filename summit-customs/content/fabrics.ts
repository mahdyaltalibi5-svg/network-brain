export type Fabric = {
  slug: string;
  name: string;
  weight: string;
  season: string;
  character: string;
  bestFor: string;
};

export const fabrics: Fabric[] = [
  {
    slug: "worsted",
    name: "Year-round worsted wool",
    weight: "270–300 g / 9.5–10.5 oz",
    season: "Year-round",
    character: "Smooth, tightly spun yarn with a clean drape that keeps a crease and resists shine.",
    bestFor: "Daily office suits, travel and the first suit in any wardrobe.",
  },
  {
    slug: "high-twist",
    name: "High-twist & fresco",
    weight: "230–270 g / 8–9.5 oz",
    season: "May–September",
    character: "An open weave of tightly twisted yarns. It breathes, springs back from creasing and handles a dry Salt Lake summer.",
    bestFor: "Summer weddings, travel suits and warm offices.",
  },
  {
    slug: "flannel",
    name: "Flannel",
    weight: "310–370 g / 11–13 oz",
    season: "October–April",
    character: "A brushed, softly napped wool that holds warmth and reads quietly expensive in grey and charcoal.",
    bestFor: "Winter suits, Park City evenings and odd trousers.",
  },
  {
    slug: "wool-linen",
    name: "Wool, silk & linen blends",
    weight: "240–280 g / 8.5–10 oz",
    season: "Late spring–summer",
    character: "Wool's structure with linen's texture and silk's subtle sheen. It creases less than pure linen.",
    bestFor: "Outdoor ceremonies, garden receptions and summer jackets.",
  },
  {
    slug: "super-fine",
    name: "Super 150s and finer",
    weight: "240–270 g / 8.5–9.5 oz",
    season: "Occasion",
    character: "Extremely fine fibre with a soft hand and lustre. Beautiful, but more delicate, and best rotated rather than worn daily.",
    bestFor: "Wedding suits, evening wear and statement pieces.",
  },
  {
    slug: "eveningwear",
    name: "Barathea & mohair for evening",
    weight: "260–320 g / 9–11 oz",
    season: "Black tie",
    character: "Pebble-weave barathea or a wool–mohair blend with a crisp sheen under evening light.",
    bestFor: "Dinner suits, black-tie weddings and galas.",
  },
];
