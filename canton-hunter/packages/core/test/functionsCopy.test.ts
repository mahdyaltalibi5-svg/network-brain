import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("supabase/functions/_shared/core", () => {
  it("is an up-to-date copy of packages/core/src (run scripts/sync-core.sh)", () => {
    const src = join(__dirname, "../src");
    const dst = join(__dirname, "../../../supabase/functions/_shared/core");
    for (const f of readdirSync(src)) {
      expect(readFileSync(join(dst, f), "utf8"), f).toBe(readFileSync(join(src, f), "utf8"));
    }
  });
});
