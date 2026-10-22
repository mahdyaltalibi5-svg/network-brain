type TtqEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "CompletePayment";

type Content = { content_id: string; content_name: string; quantity: number; price: number };

declare global {
  interface Window {
    ttq?: { track: (event: string, props?: Record<string, unknown>) => void };
  }
}

// `value` defaults to the sum of contents; pass the discounted total when there is one.
export function track(event: TtqEvent, contents: Content[], value = contents.reduce((sum, c) => sum + c.price * c.quantity, 0)) {
  window.ttq?.track(event, { contents, content_type: "product", value, currency: "USD" });
}
