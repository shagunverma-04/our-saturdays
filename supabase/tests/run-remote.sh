#!/usr/bin/env bash
# Integration test of lib/remote.ts: throwaway Postgres + PostgREST (needs `postgres` and `postgrest` on PATH, Node 22+).
set -euo pipefail
cd "$(dirname "$0")/.."
D=$(mktemp -d); PG=54330; REST=3901
export LC_ALL=${LC_ALL:-en_US.UTF-8} JWT_SECRET=test-secret-test-secret-test-secret-32
initdb -D "$D/data" -U postgres --auth=trust -E UTF8 >/dev/null
pg_ctl -D "$D/data" -o "-p $PG -c listen_addresses=127.0.0.1 -c unix_socket_directories=$D" -l "$D/pg.log" -w start >/dev/null
PGREST_PID=""
trap '[ -n "$PGREST_PID" ] && kill $PGREST_PID 2>/dev/null; pg_ctl -D "$D/data" -m immediate stop >/dev/null 2>&1; rm -rf "$D"' EXIT
P=(psql -h 127.0.0.1 -p $PG -U postgres -v ON_ERROR_STOP=1 -q -X)
"${P[@]}" -c "create database t"; P+=(-d t)
"${P[@]}" -f tests/stubs.sql 2>/dev/null; "${P[@]}" -f schema.sql; "${P[@]}" -f 002_photos_and_realtime.sql 2>/dev/null
"${P[@]}" -c "insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','a@x.test','{\"name\":\"Alice\"}'),('00000000-0000-0000-0000-00000000000b','b@x.test','{\"name\":\"Bob\"}'),
 ('00000000-0000-0000-0000-00000000000c','c@x.test','{}'),('00000000-0000-0000-0000-00000000000d','d@x.test','{}')"
PGRST_DB_URI="postgres://authenticator@127.0.0.1:$PG/t" PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon \
  PGRST_JWT_SECRET="$JWT_SECRET" PGRST_SERVER_PORT=$REST postgrest >"$D/rest.log" 2>&1 &
PGREST_PID=$!
for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$REST/" >/dev/null 2>&1 && break; sleep 0.25; done
REST_URL="http://127.0.0.1:$REST" node tests/remote.test.ts || { echo "--- postgrest log"; tail -20 "$D/rest.log"; exit 1; }
