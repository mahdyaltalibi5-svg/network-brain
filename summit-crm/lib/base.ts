/**
 * The CRM is served under /portal (summitcustomsuits.com/portal routes here). Next adds this to
 * links, redirects and assets on its own; anything built by hand (fetch, sendBeacon, the service
 * worker, alert links, the manifest) goes through withBase().
 */
export const BASE = "/portal";
export const withBase = (path: string) => `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
