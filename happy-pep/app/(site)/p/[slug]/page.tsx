import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/products";
import { ProductDetail } from "./product-detail";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return p ? { title: `${p.name} · Happy Pep`, description: `${p.name}, ${p.kind}. Third-party tested. Free BAC water with every order.` } : {};
}

export default async function ProductPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
