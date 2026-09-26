export function env(key: string, fallback?: string): string {
  const v = Deno.env.get(key) ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing env var ${key}`);
  return v;
}
export function envOpt(key: string): string | undefined {
  const v = Deno.env.get(key);
  return v === "" ? undefined : v;
}
