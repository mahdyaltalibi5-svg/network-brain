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
  // Link to the batch COA PDF. Leave empty until it's uploaded.
  coaUrl: string;
  cap: string;
};

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
    coaUrl: "",
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
    coaUrl: "",
    cap: "#0A2BC4",
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
    coaUrl: "",
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
    coaUrl: "",
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
    coaUrl: "",
    cap: "#0A2BC4",
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
    coaUrl: "",
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
    coaUrl: "",
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
    coaUrl: "",
    cap: "#0A2BC4",
  },
  {
    slug: "selank",
    name: "Selank",
    kind: "Heptapeptide",
    description:
      "Synthetic heptapeptide supplied as a lyophilized powder in a sealed vial. 99%+ purity by HPLC, identity confirmed by mass spec.",
    sizes: [{ label: "10mg", price: 55, inStock: false }],
    lot: "HP-SEL-2410",
    coaUrl: "",
    cap: "#5B7BFF",
  },
];

export const isInStock = (p: Product) => p.sizes.some((s) => s.inStock);

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export function priceOf(slug: string, size: string) {
  return getProduct(slug)?.sizes.find((s) => s.label === size)?.price ?? 0;
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });
