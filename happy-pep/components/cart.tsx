"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct, priceOf } from "@/lib/products";
import { track } from "@/lib/pixel";

export type Line = { slug: string; size: string; qty: number };

type Cart = {
  lines: Line[];
  // False until the saved cart has been read from localStorage.
  ready: boolean;
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (slug: string, size: string, qty?: number) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<Cart | null>(null);
const KEY = "hp_cart";

export function toContents(lines: Line[]) {
  return lines.map((l) => ({
    content_id: `${l.slug}-${l.size}`,
    content_name: `${getProduct(l.slug)?.name ?? l.slug} ${l.size}`,
    quantity: l.qty,
    price: priceOf(l.slug, l.size),
  }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Line[];
      // Drop anything no longer in the catalog. Reading storage has to wait
      // until after hydration, so setting state here is intended.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLines(saved.filter((l) => priceOf(l.slug, l.size) > 0 && l.qty > 0));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, loaded]);

  const add = useCallback((slug: string, size: string, qty = 1) => {
    setLines((prev) => {
      const hit = prev.find((l) => l.slug === slug && l.size === size);
      if (hit) return prev.map((l) => (l === hit ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { slug, size, qty }];
    });
    track("AddToCart", toContents([{ slug, size, qty }]));
  }, []);

  const setQty = useCallback((slug: string, size: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => !(l.slug === slug && l.size === size))
        : prev.map((l) => (l.slug === slug && l.size === size ? { ...l, qty } : l)),
    );
  }, []);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Cart>(
    () => ({
      lines,
      ready: loaded,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * priceOf(l.slug, l.size), 0),
      isOpen,
      open,
      close,
      add,
      setQty,
      clear,
    }),
    [lines, loaded, isOpen, open, close, add, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
