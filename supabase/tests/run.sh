#!/usr/bin/env bash
# Runs schema.sql + 002 + RLS tests on a throwaway local Postgres (needs postgres on PATH). No Supabase account needed.
set -euo pipefail
cd "$(dirname "$0")/.."
D=$(mktemp -d); PORT=${PGPORT_TEST:-54329}
export LC_ALL=${LC_ALL:-en_US.UTF-8}
initdb -D "$D/data" -U postgres --auth=trust -E UTF8 >/dev/null
pg_ctl -D "$D/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$D" -l "$D/log" -w start >/dev/null
trap 'pg_ctl -D "$D/data" -m immediate stop >/dev/null 2>&1; rm -rf "$D"' EXIT
P=(psql -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${P[@]}" -c "create database t"; P+=(-d t)
"${P[@]}" -f tests/stubs.sql 2>/dev/null
"${P[@]}" -f schema.sql
"${P[@]}" -f 002_photos_and_realtime.sql 2>/dev/null
"${P[@]}" -f 003_interactions.sql
"${P[@]}" -f 003_interactions.sql   # idempotent
"${P[@]}" -f 002_photos_and_realtime.sql 2>/dev/null   # idempotent
"${P[@]}" -t -A -f tests/rls.test.sql | grep -E "PASSED|ERROR" || { echo "FAILED"; "${P[@]}" -f tests/rls.test.sql 2>&1 | grep -E "ERROR|CONTEXT" ; exit 1; }
