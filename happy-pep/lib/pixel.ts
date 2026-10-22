type TtqEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "CompletePayment";

type Content = { content_id: string; content_name: string; quantity: number; price: number };

declare global {
  interface Window {
    ttq?: { track: (event: string, props?: Record<string, unknown>) => void };
  }
}

export function track(event: TtqEvent, contents: Content[]) {
  const value = contents.reduce((sum, c) => sum + c.price * c.quantity, 0);
  window.ttq?.track(event, { contents, content_type: "product", value, currency: "USD" });
}
