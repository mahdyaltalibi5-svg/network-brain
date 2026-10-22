// Placeholder catalog: replace names, sizes, prices, lots and COA links with
// your real inventory. Keep descriptions factual (identity, form, purity):
// no health, dosing or results claims.

export type Size = { label: string; price: number; inStock: boolean };

export type Product = {
  slug: string;
  name: string;
  kind: string;
  description: string;
  sizes: Size[];
  lot: string;
  // Batch Certificate of Analysis. Leave fields empty until the real COA is in.
  coa: { url: string; lab: string; date: string; purity: string };
  // Optional card badge, e.g. "Bestseller". Only use it if it's true.
  badge?: string;
  cap: string;
};

const NO_COA = { url: "", lab: "", date: "", purity: "" };

export const products: Product[] = [
  {
    slug: "bpc-157",
    name: "BPC-157",
    kind: "Pentadecapeptide",
    description:
      "Synthetic 15-amino-acid peptide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [
      { label: "5mg", price: 39, inStock: true },
      { label: "10mg", price: 59, inStock: true },
    ],
    lot: "HP-BPC-2410",
    coa: NO_COA,
    cap: "#3EF5B9",
  },
  {
    slug: "tb-500",
    name: "TB-500",
    kind: "Synthetic peptide fragment",
    description:
      "Synthetic peptide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [
      { label: "5mg", price: 45, inStock: true },
      { label: "10mg", price: 79, inStock: true },
    ],
    lot: "HP-TB5-2410",
    coa: NO_COA,
    cap: "#0125C4",
  },
  {
    slug: "ghk-cu",
    name: "GHK-Cu",
    kind: "Copper tripeptide",
    description:
      "Copper-complexed tripeptide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [
      { label: "50mg", price: 39, inStock: true },
      { label: "100mg", price: 59, inStock: true },
    ],
    lot: "HP-GHK-2410",
    coa: NO_COA,
    cap: "#5B7BFF",
  },
  {
    slug: "bpc-tb-blend",
    name: "BPC + TB Blend",
    kind: "Peptide blend",
    description:
      "BPC-157 and TB-500 combined in one sealed vial as a lyophilized powder. Each component verified by HPLC and mass spec.",
    sizes: [{ label: "10mg", price: 89, inStock: true }],
    lot: "HP-BLD-2410",
    coa: NO_COA,
    cap: "#3EF5B9",
  },
  {
    slug: "nad-plus",
    name: "NAD+",
    kind: "Coenzyme",
    description:
      "Nicotinamide adenine dinucleotide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC.",
    sizes: [{ label: "500mg", price: 89, inStock: true }],
    lot: "HP-NAD-2410",
    coa: NO_COA,
    cap: "#0125C4",
  },
  {
    slug: "ipamorelin",
    name: "Ipamorelin",
    kind: "Pentapeptide",
    description:
      "Synthetic pentapeptide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [
      { label: "5mg", price: 35, inStock: true },
      { label: "10mg", price: 59, inStock: true },
    ],
    lot: "HP-IPA-2410",
    coa: NO_COA,
    cap: "#5B7BFF",
  },
  {
    slug: "cjc-1295",
    name: "CJC-1295",
    kind: "No DAC · Synthetic peptide",
    description:
      "Synthetic peptide (without DAC) supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [{ label: "5mg", price: 45, inStock: true }],
    lot: "HP-CJC-2410",
    coa: NO_COA,
    cap: "#3EF5B9",
  },
  {
    slug: "epitalon",
    name: "Epitalon",
    kind: "Tetrapeptide",
    description:
      "Synthetic tetrapeptide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [{ label: "10mg", price: 49, inStock: true }],
    lot: "HP-EPI-2410",
    coa: NO_COA,
    cap: "#0125C4",
  },
  {
    slug: "selank",
    name: "Selank",
    kind: "Heptapeptide",
    description:
      "Synthetic heptapeptide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [{ label: "10mg", price: 55, inStock: false }],
    lot: "HP-SEL-2410",
    coa: NO_COA,
    cap: "#5B7BFF",
  },
];

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
