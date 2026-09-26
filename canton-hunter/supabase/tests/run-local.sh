#!/usr/bin/env bash
# Spin up a throwaway Postgres, apply migrations + seed on top of auth stubs, run behavior tests.
set -euo pipefail
# initdb refuses to run as root: re-run as the postgres user (it only needs to read the repo).
if [ "$(id -u)" = "0" ]; then
  exec runuser -u postgres -- bash "$(cd "$(dirname "$0")" && pwd)/run-local.sh" "$@"
fi
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/.."
bin="${PG_BIN:-/usr/lib/postgresql/16/bin}"
tmp="$(mktemp -d)"
trap '"$bin/pg_ctl" -D "$tmp/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT
"$bin/initdb" -D "$tmp/data" -U postgres -A trust >/dev/null
"$bin/pg_ctl" -D "$tmp/data" -o "-k $tmp -p 55432 -c listen_addresses=''" -l "$tmp/log" start >/dev/null
export PGHOST="$tmp" PGPORT=55432 PGUSER=postgres PGDATABASE=postgres
psql -q -v ON_ERROR_STOP=1 -f "$here/stubs.sql" >/dev/null
for f in "$root"/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null || { echo "migration failed: $f"; exit 1; }
done
psql -q -v ON_ERROR_STOP=1 -f "$root/seed.sql" >/dev/null
out="$(psql -q -f "$here/db_test.sql" 2>&1 || true)"
if [ "${DEBUG:-}" = "1" ]; then echo "$out"; psql -c "select type,status,payload from public.jobs"; fi
echo "$out" | grep -E "FAIL|PASSED" || { echo "$out" | tail -20; exit 1; }
echo "$out" | grep -q "ALL DB TESTS PASSED"
# end-to-end multi-phone sync simulation (needs node + the pg package from the workspace)
NODE_PATH="${NODE_PATH:-}" node --experimental-strip-types --no-warnings "$here/sync_sim.mjs"
