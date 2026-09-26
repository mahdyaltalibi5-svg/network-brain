import { env, envOpt } from "./env.ts";

/** Shopify Admin GraphQL. Env: SHOPIFY_STORE_DOMAIN (xxx.myshopify.com), SHOPIFY_ADMIN_TOKEN, optional SHOPIFY_PUBLIC_DOMAIN. */
export function shopifyConfigured(): boolean {
  return !!(envOpt("SHOPIFY_STORE_DOMAIN") && envOpt("SHOPIFY_ADMIN_TOKEN"));
}

// deno-lint-ignore no-explicit-any
export async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const version = envOpt("SHOPIFY_API_VERSION") ?? "2026-07";
  const res = await fetch(`https://${env("SHOPIFY_STORE_DOMAIN")}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": env("SHOPIFY_ADMIN_TOKEN") },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`Shopify ${res.status}: ${JSON.stringify(body.errors ?? body).slice(0, 500)}`);
  return body.data as T;
}

function userErrors(payload: { userErrors?: { field?: string[]; message: string }[] } | null | undefined, what: string) {
  const errs = payload?.userErrors ?? [];
  if (errs.length) throw new Error(`Shopify ${what}: ${errs.map((e) => `${e.field?.join(".") ?? ""} ${e.message}`).join("; ")}`);
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export interface ProductDraft {
  title: string;
  handle: string;
  descriptionHtml: string;
  priceUsd: number;
  compareAtUsd: number | null;
  mode: "waitlist" | "preorder";
  shipByText: string;
  imageUrls: string[];
  metafields: Record<string, unknown>; // stored as json in namespace "canton"
}

export async function createTestProduct(p: ProductDraft): Promise<{ productId: string; handle: string; url: string }> {
  const created = await gql(
    `mutation($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product { id handle variants(first: 1) { nodes { id } } }
        userErrors { field message }
      }
    }`,
    {
      product: {
        title: p.title,
        handle: p.handle,
        descriptionHtml: p.descriptionHtml,
        status: "ACTIVE",
        templateSuffix: "test-product",
        tags: ["canton-test", `mode-${p.mode}`],
        metafields: [
          ...Object.entries(p.metafields).map(([key, value]) => ({ namespace: "canton", key, type: "json", value: JSON.stringify(value) })),
          { namespace: "canton", key: "mode", type: "single_line_text_field", value: p.mode },
          { namespace: "canton", key: "ship_by", type: "single_line_text_field", value: p.shipByText },
        ],
      },
      media: p.imageUrls.map((u) => ({ originalSource: u, mediaContentType: "IMAGE", alt: p.title })),
    },
  );
  userErrors(created.productCreate, "productCreate");
  const product = created.productCreate.product;
  const variantId = product.variants.nodes[0]?.id;
  if (variantId) {
    const upd = await gql(
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } }
      }`,
      {
        productId: product.id,
        variants: [{
          id: variantId,
          price: p.priceUsd.toFixed(2),
          compareAtPrice: p.compareAtUsd ? p.compareAtUsd.toFixed(2) : null,
          // preorder: sell with no stock; waitlist: the theme hides the buy button
          inventoryPolicy: p.mode === "preorder" ? "CONTINUE" : "DENY",
        }],
      },
    );
    userErrors(upd.productVariantsBulkUpdate, "productVariantsBulkUpdate");
  }
  await publishToOnlineStore(product.id);
  const domain = envOpt("SHOPIFY_PUBLIC_DOMAIN") ?? env("SHOPIFY_STORE_DOMAIN");
  return { productId: product.id, handle: product.handle, url: `https://${domain}/products/${product.handle}` };
}

async function publishToOnlineStore(productId: string): Promise<void> {
  const pubs = await gql(`{ publications(first: 20) { nodes { id name } } }`);
  const online = pubs.publications.nodes.find((n: { name: string }) => /online store/i.test(n.name));
  if (!online) throw new Error("Shopify: Online Store publication not found");
  const res = await gql(
    `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`,
    { id: productId, input: [{ publicationId: online.id }] },
  );
  userErrors(res.publishablePublish, "publishablePublish");
}

/** Waitlist signups = customers tagged waitlist-<handle> (set by the theme's customer form). */
export async function countWaitlist(handle: string): Promise<number> {
  let count = 0;
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    // deno-lint-ignore no-explicit-any
    const res: any = await gql(
      `query($q: String!, $after: String) { customers(first: 250, query: $q, after: $after) { nodes { id } pageInfo { hasNextPage endCursor } } }`,
      { q: `tag:'waitlist-${handle}'`, after },
    );
    count += res.customers.nodes.length;
    if (!res.customers.pageInfo.hasNextPage) break;
    after = res.customers.pageInfo.endCursor;
  }
  return count;
}

/** Preorders: orders since `sinceIso` containing the product. Returns count + revenue. */
export async function countPreorders(productId: string, sinceIso: string): Promise<{ orders: number; revenueCents: number }> {
  let orders = 0;
  let revenue = 0;
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    // deno-lint-ignore no-explicit-any
    const res: any = await gql(
      `query($q: String!, $after: String) {
        orders(first: 100, query: $q, after: $after) {
          nodes { id cancelledAt lineItems(first: 20) { nodes { quantity product { id } originalTotalSet { shopMoney { amount } } } } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { q: `created_at:>='${sinceIso}'`, after },
    );
    for (const o of res.orders.nodes) {
      if (o.cancelledAt) continue;
      const lines = o.lineItems.nodes.filter((l: { product: { id: string } | null }) => l.product?.id === productId);
      if (lines.length) {
        orders++;
        for (const l of lines) revenue += Math.round(Number(l.originalTotalSet.shopMoney.amount) * 100);
      }
    }
    if (!res.orders.pageInfo.hasNextPage) break;
    after = res.orders.pageInfo.endCursor;
  }
  return { orders, revenueCents: revenue };
}
