import type { Metadata } from "next";
import { ShopLanding } from "@/components/shop-landing";

export const metadata: Metadata = {
  title: "Shop · Happy Pep",
  description: "Third-party tested research peptides. Same-day delivery in Utah, 5 days anywhere in the USA, free BAC water with every order.",
};

// Point TikTok ads here: age gate → straight into the products.
export default function ShopPage() {
  return <ShopLanding />;
}
