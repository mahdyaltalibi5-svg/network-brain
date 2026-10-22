// The catalog. Keep descriptions factual (identity, form, purity): no health,
// dosing or results claims. Photos live in public/products (square, 1000px).

export type Size = { label: string; price: number; inStock: boolean; image?: string };

export type Product = {
  slug: string;
  name: string;
  kind: string;
  description: string;
  sizes: Size[];
  // Product photo (square). A size's own image wins when that size is selected.
  image?: string;
  lot: string;
  // Batch Certificate of Analysis. Leave fields empty until the real COA is in.
  coa: { url: string; lab: string; date: string; purity: string };
  // Optional card badge, e.g. "Bestseller". Only use it if it's true.
  badge?: string;
  // Cap color for the illustrated fallback vial (used when there's no photo).
  cap: string;
};

const NO_COA = { url: "", lab: "", date: "", purity: "" };

const desc = (form = "Research peptide") =>
  `${form} supplied as a lyophilized powder in a sealed vial. Third-party tested for purity (HPLC) and identity (mass spec); batch COA linked above.`;

// PRICES ARE PLACEHOLDERS: set your real prices before launch.
export const products: Product[] = [
  {
    slug: "rt",
    name: "RT",
    kind: "Research peptide",
    description: desc(),
    sizes: [
      { label: "10mg", price: 99, inStock: true, image: "/products/rt-10mg.webp" },
      { label: "20mg", price: 169, inStock: true, image: "/products/rt-20mg.webp" },
    ],
    image: "/products/rt-10mg.webp",
    lot: "HP-RT-2410",
    coa: NO_COA,
    cap: "#3EF5B9",
  },
  {
    slug: "tr",
    name: "TR",
    kind: "Research peptide",
    description: desc(),
    sizes: [{ label: "10mg", price: 79, inStock: true }],
    image: "/products/tr-10mg.webp",
    lot: "HP-TR-2410",
    coa: NO_COA,
    cap: "#0125C4",
  },
  {
    slug: "glp-1",
    name: "GLP-1",
    kind: "Research peptide",
    description: desc(),
    sizes: [{ label: "5mg", price: 59, inStock: true }],
    image: "/products/glp-1-5mg.webp",
    lot: "HP-GLP-2410",
    coa: NO_COA,
    cap: "#5B7BFF",
  },
  {
    slug: "bc",
    name: "BC",
    kind: "Research peptide",
    description: desc(),
    sizes: [{ label: "10mg", price: 59, inStock: true }],
    image: "/products/bc-10mg.webp",
    lot: "HP-BC-2410",
    coa: NO_COA,
    cap: "#3EF5B9",
  },
  {
    slug: "tesa",
    name: "TESA",
    kind: "Research peptide",
    description: desc(),
    sizes: [{ label: "10mg", price: 119, inStock: true }],
    image: "/products/tesa-10mg.webp",
    lot: "HP-TESA-2410",
    coa: NO_COA,
    cap: "#0125C4",
  },
  {
    slug: "ghk-cu",
    name: "GHK-Cu",
    kind: "Copper tripeptide",
    description: desc("Copper-complexed tripeptide"),
    sizes: [{ label: "10mg", price: 39, inStock: true }],
    image: "/products/ghk-cu-10mg.webp",
    lot: "HP-GHK-2410",
    coa: NO_COA,
    cap: "#5B7BFF",
  },
];

export const imageFor = (p: Product, size?: string) => p.sizes.find((s) => s.label === size)?.image ?? p.image;

export const isInStock = (p: Product) => p.sizes.some((s) => s.inStock);

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export function priceOf(slug: string, size: string) {
  return getProduct(slug)?.sizes.find((s) => s.label === size)?.price ?? 0;
}

// Price per mg, for "best value" callouts. Null for sizes not in mg.
export function perMg(s: Size) {
  const mg = parseFloat(s.label);
  return s.label.endsWith("mg") && mg > 0 ? s.price / mg : null;
}

// The size with the lowest price per mg, if it beats the smallest size by 10%+.
export function bestValue(p: Product) {
  const sized = p.sizes.filter((s) => s.inStock && perMg(s) !== null);
  if (sized.length < 2) return null;
  const sorted = [...sized].sort((a, b) => perMg(a)! - perMg(b)!);
  const best = sorted[0];
  const worst = sorted.at(-1)!;
  const save = 1 - perMg(best)! / perMg(worst)!;
  return save >= 0.1 ? { label: best.label, save } : null;
}

// Start on the best-value size when there is one, else the first in stock.
export function defaultSize(p: Product) {
  return bestValue(p)?.label ?? (p.sizes.find((s) => s.inStock) ?? p.sizes[0]).label;
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });
