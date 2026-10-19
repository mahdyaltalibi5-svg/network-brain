import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost" | "text";
  className?: string;
};

const base =
  "group inline-flex items-center justify-center gap-3 text-[0.78rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-500 ease-expo";

const variants = {
  solid: "bg-gold text-void px-7 py-4 hover:bg-ivory",
  ghost: "border border-gold/60 text-ivory px-7 py-4 hover:border-ivory hover:bg-ivory hover:text-void",
  text: "text-gold hover:text-ivory py-2",
};

export function LinkButton({ href, children, variant = "solid", className = "" }: Props) {
  const external = /^(https?:|mailto:|tel:)/.test(href);
  const cls = `${base} ${variants[variant]} ${className}`;
  const arrow = (
    <span aria-hidden="true" className="transition-transform duration-500 ease-expo group-hover:translate-x-1">
      →
    </span>
  );
  return external ? (
    <a href={href} className={cls} data-magnetic>
      {children}
      {arrow}
    </a>
  ) : (
    <Link href={href} className={cls} data-magnetic>
      {children}
      {arrow}
    </Link>
  );
}
