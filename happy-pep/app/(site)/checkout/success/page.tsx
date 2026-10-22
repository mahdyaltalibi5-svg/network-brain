"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { toContents, useCart } from "@/components/cart";
import { Button } from "@/components/button";
import { Smile } from "@/components/smile";
import { track } from "@/lib/pixel";

// Your payment processor redirects here after a successful payment.
export default function SuccessPage() {
  const { lines, clear } = useCart();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || lines.length === 0) return;
    done.current = true;
    track("CompletePayment", toContents(lines));
    clear();
  }, [lines, clear]);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-28 text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
        <Smile draw delay={0.2} className="w-32" width={12} />
      </motion.div>
      <h1 className="mt-6 font-display text-4xl font-semibold">Order placed!</h1>
      <p className="mt-3 text-pep-ink/70">Check your email for confirmation and tracking. Your free BAC water is in the box.</p>
      <Button tone="blue" href="/" className="mt-8">
        Back home
      </Button>
    </section>
  );
}
