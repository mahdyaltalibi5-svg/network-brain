"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toContents, useCart } from "@/components/cart";
import { Button } from "@/components/button";
import { spring } from "@/components/reveal";
import { getProduct, money, priceOf } from "@/lib/products";
import { placeOrder } from "./actions";
import { getSource } from "@/lib/source";
import { pct, pricing } from "@/lib/pricing";
import { DeliveryPromise, useZip } from "@/components/delivery";
import { Unlocks } from "@/components/cart-drawer";
import { track } from "@/lib/pixel";

const field =
  "h-13 w-full rounded-2xl bg-white px-4 text-pep-ink ring-1 ring-pep-ink/10 placeholder:text-pep-ink/40 transition-shadow focus:outline-none focus:ring-2 focus:ring-pep-blue";

export default function CheckoutPage() {
  const { lines, ready, open } = useCart();
  const p = pricing(lines);
  const zip = useZip();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ id: string; email: string } | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || lines.length === 0) return;
    tracked.current = true;
    track("InitiateCheckout", toContents(lines), pricing(lines).grandTotal);
  }, [lines]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    const res = await placeOrder({
      lines,
      customer: { email: f.email, name: f.name, phone: f.phone, address: f.address, city: f.city, state: f.state, zip: f.zip },
      ...getSource(),
    }).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if (res.paymentUrl) {
      window.location.assign(res.paymentUrl);
      return;
    }
    // No payment processor connected yet: the order is saved as "awaiting payment".
    setSaved({ id: res.orderId, email: f.email });
    setBusy(false);
  }

  if (!ready) return <section className="min-h-[60vh]" />;

  if (saved) {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-28 text-center">
        <h1 className="font-display text-4xl font-semibold">Order saved: {saved.id}</h1>
        <p className="text-pep-ink/70">
          Online payment isn&apos;t live yet. We&apos;ll reach out at <b>{saved.email}</b> to complete your order.
        </p>
        <Button tone="blue" href="/shop">
          Back to shop
        </Button>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-28 text-center">
        <h1 className="font-display text-4xl font-semibold">Your cart is empty.</h1>
        <Button tone="blue" href="/shop">
          Shop now
        </Button>
      </section>
    );
  }

  return (
    <section className="pb-20 pt-8 md:pt-14">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr]">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Checkout</h1>

          <fieldset className="space-y-3">
            <legend className="mb-3 font-display text-lg font-semibold">Contact</legend>
            <input name="email" type="email" required autoComplete="email" placeholder="Email" className={field} />
            <input name="phone" type="tel" autoComplete="tel" placeholder="Phone (for delivery updates)" className={field} />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-3 font-display text-lg font-semibold">Shipping</legend>
            <input name="name" required autoComplete="name" placeholder="Full name" className={field} />
            <input name="address" required autoComplete="street-address" placeholder="Address" className={field} />
            <div className="grid grid-cols-[1.4fr_0.7fr_1fr] gap-3">
              <input name="city" required autoComplete="address-level2" placeholder="City" className={field} />
              <input name="state" required autoComplete="address-level1" placeholder="State" maxLength={2} className={`${field} uppercase`} />
              <input name="zip" required autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" placeholder="ZIP" defaultValue={zip} key={zip} className={field} />
            </div>
          </fieldset>

          <label className="flex items-start gap-3 text-sm text-pep-ink/70">
            <input type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-pep-blue" />
            <span>
              I confirm I&apos;m 21+ and that these products are for laboratory research use only, per the{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms
              </Link>
              .
            </span>
          </label>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <Button tone="blue" type="submit" disabled={busy} className="w-full">
            {busy ? "One sec…" : `Pay ${money(p.grandTotal)}`}
          </Button>

          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-pep-ink/60">
            <li>🔒 Secure checkout</li>
            <li>⚡ Same-day Utah</li>
            <li>📦 5 days or free shipping</li>
            <li>🧪 COA on every lot</li>
          </ul>
        </motion.form>

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.06 }}
          className="h-fit rounded-[28px] bg-white p-6 md:sticky md:top-32"
        >
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {lines.map((l) => (
              <li key={`${l.slug}-${l.size}`} className="flex justify-between gap-3">
                <span>
                  {getProduct(l.slug)?.name} {l.size} × {l.qty}
                </span>
                <span className="font-semibold">{money(priceOf(l.slug, l.size) * l.qty)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 text-pep-blue">
              <span>💧 Free BAC Water</span>
              <span className="font-semibold">$0.00 ✓</span>
            </li>
          </ul>
          <div className="mt-5 space-y-2 border-t border-pep-ink/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-pep-ink/70">Subtotal</span>
              <span>{money(p.subtotal)}</span>
            </div>
            {p.discount > 0 && (
              <div className="flex justify-between font-semibold text-pep-blue">
                <span>Stack savings ({pct(p.off)})</span>
                <span>−{money(p.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-pep-ink/70">Shipping</span>
              <span className={p.freeShipping ? "font-semibold text-pep-blue" : ""}>{p.freeShipping ? "FREE" : money(p.shipping)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-pep-ink/10 pt-3">
            <span className="text-pep-ink/70">Total</span>
            <span className="font-display text-2xl font-semibold">{money(p.grandTotal)}</span>
          </div>
          <DeliveryPromise className="mt-4" />
          {(p.nextTier || !p.freeShipping) && (
            <div className="mt-4">
              <Unlocks p={p} />
              <button type="button" onClick={open} className="mt-2 w-full text-center text-sm font-semibold text-pep-blue underline underline-offset-2">
                Add more to save
              </button>
            </div>
          )}
        </motion.aside>
      </div>
    </section>
  );
}
