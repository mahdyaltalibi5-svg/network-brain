import { readSettings, writeSettings } from "./vault";

/**
 * API keys Kobe can paste into Settings (stored encrypted in the database). An environment
 * variable with the same name still works and wins, so nothing set in Vercel breaks.
 */
export const SECRETS = {
  anthropic: { key: "secret.anthropic_api_key", env: "ANTHROPIC_API_KEY", label: "Claude API key", test: /^sk-ant-[\w-]{20,}$/ },
  github: { key: "secret.github_token", env: "GITHUB_TOKEN", label: "GitHub token", test: /^(github_pat_|ghp_)[\w]{20,}$/ },
  vercel: { key: "secret.vercel_token", env: "VERCEL_TOKEN", label: "Vercel token", test: /^[\w-]{20,}$/ },
} as const;
export type SecretName = keyof typeof SECRETS;

export async function getSecret(name: SecretName): Promise<string | undefined> {
  const s = SECRETS[name];
  const fromEnv = process.env[s.env]?.trim();
  if (fromEnv) return fromEnv;
  return (await readSettings(s.key))[s.key];
}

export async function secretStatus(): Promise<Record<SecretName, boolean>> {
  const out = {} as Record<SecretName, boolean>;
  for (const n of Object.keys(SECRETS) as SecretName[]) out[n] = !!(await getSecret(n));
  return out;
}

export async function saveSecret(name: SecretName, value: string) {
  const s = SECRETS[name];
  const v = value.trim();
  if (!s.test.test(v)) throw new Error(`That doesn't look like a ${s.label}.`);
  await writeSettings({ [s.key]: v }, [s.key]);
}
