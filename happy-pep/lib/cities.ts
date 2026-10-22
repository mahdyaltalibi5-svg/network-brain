// Local landing pages (/utah/[slug]) for cities inside the same-day zones.
// Keep this list to places you actually deliver same-day.
export const cities = [
  { slug: "salt-lake-city", name: "Salt Lake City", county: "Salt Lake County" },
  { slug: "west-valley-city", name: "West Valley City", county: "Salt Lake County" },
  { slug: "sandy", name: "Sandy", county: "Salt Lake County" },
  { slug: "west-jordan", name: "West Jordan", county: "Salt Lake County" },
  { slug: "south-jordan", name: "South Jordan", county: "Salt Lake County" },
  { slug: "draper", name: "Draper", county: "Salt Lake County" },
  { slug: "provo", name: "Provo", county: "Utah County" },
  { slug: "orem", name: "Orem", county: "Utah County" },
  { slug: "lehi", name: "Lehi", county: "Utah County" },
  { slug: "american-fork", name: "American Fork", county: "Utah County" },
  { slug: "layton", name: "Layton", county: "Davis County" },
  { slug: "bountiful", name: "Bountiful", county: "Davis County" },
];

export const getCity = (slug: string) => cities.find((c) => c.slug === slug);
