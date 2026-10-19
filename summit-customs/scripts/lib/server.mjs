import { spawn, execFileSync } from "node:child_process";

export const PORT = Number(process.env.PORT ?? 3100);
export const ORIGIN = `http://localhost:${PORT}`;

/** Start `next start` (production build must exist) unless BASE_URL is given. */
export async function withServer(fn) {
  if (process.env.BASE_URL) return fn(process.env.BASE_URL);
  const busy = await fetch(ORIGIN).then(() => true, () => false);
  if (busy) throw new Error(`port ${PORT} is already in use; stop the stale server first`);
  const proc = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  let log = "";
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
  try {
    for (let i = 0; i < 100; i++) {
      try {
        const r = await fetch(ORIGIN + "/robots.txt");
        if (r.ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
      if (i === 99) throw new Error("server did not start:\n" + log);
    }
    return await fn(ORIGIN);
  } finally {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {
      proc.kill("SIGTERM");
    }
  }
}

/** Raw fetch with curl: no JavaScript, exactly what a crawler sees. */
export function curl(url, ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)") {
  const out = execFileSync("curl", ["-sS", "-A", ua, "-w", "\n__STATUS__%{http_code}", url], { maxBuffer: 20 * 1024 * 1024 }).toString();
  const i = out.lastIndexOf("\n__STATUS__");
  return { status: Number(out.slice(i + 11)), body: out.slice(0, i) };
}

/** Paths from the built sitemap. */
export function sitemapPaths(base) {
  const { body } = curl(`${base}/sitemap.xml`);
  return [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}
