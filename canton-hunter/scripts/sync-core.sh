#!/usr/bin/env bash
# Copy packages/core/src into supabase/functions/_shared/core so Edge Function deploys are self-contained.
# A core test fails if the copy is stale, so run this after editing packages/core.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$root/supabase/functions/_shared/core"
mkdir -p "$root/supabase/functions/_shared/core"
cp "$root"/packages/core/src/*.ts "$root/supabase/functions/_shared/core/"
echo "synced core -> supabase/functions/_shared/core"
