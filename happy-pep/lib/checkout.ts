import type { Line } from "@/components/cart";

export type Customer = {
  email: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
};

// Connect your payment processor here. It should create a hosted checkout
// session for these lines + customer and return its URL; the processor then
// redirects back to /checkout/success after payment.
// Most mainstream processors don't allow research peptides, so use a
// high-risk-approved provider.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function startPayment(lines: Line[], customer: Customer): Promise<string> {
  throw new Error("Payment processor not connected yet.");
}
