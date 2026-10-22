import Image from "next/image";
import { Vial } from "./vial";
import { imageFor, type Product } from "@/lib/products";

// Product photo for the selected size, falling back to the illustrated vial.
export function ProductImage({
  product,
  size,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority = false,
  className = "",
}: {
  product: Product;
  size: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const src = imageFor(product, size);
  if (!src) return <Vial name={product.name} size={size} cap={product.cap} className={className} />;
  return (
    <span className={`relative block aspect-square overflow-hidden rounded-2xl bg-[#0033DD] ${className}`}>
      <Image src={src} alt={`${product.name} ${size} vial`} fill sizes={sizes} priority={priority} className="object-cover" />
    </span>
  );
}
