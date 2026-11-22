#!/usr/bin/env bash
# Production start: normalise DATABASE_URL, run diagnostics, migrations, idempotent seed, start Next.js.
set -euo pipefail

# Trim whitespace / quotes / a leading "psql " that may come from copy-pasting a connection snippet
DB="$(printf '%s' "${DATABASE_URL:-}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^psql[[:space:]]*//" -e "s/^['\"]//" -e "s/['\"]$//")"
# Prisma's engines do not support libpq's channel_binding parameter (Neon adds it by default) — drop it
DB="$(printf '%s' "$DB" | sed -E -e 's/([?&])channel_binding=[^&]*&?/\1/' -e 's/[?&]$//')"
# Managed Postgres providers (Neon, Supabase...) require TLS
if [[ "$DB" != *"sslmode="* ]]; then
  if [[ "$DB" == *"?"* ]]; then DB="$DB&sslmode=require"; else DB="$DB?sslmode=require"; fi
fi
# Give serverless databases time to wake up
if [[ "$DB" != *"connect_timeout="* ]]; then DB="$DB&connect_timeout=30"; fi
export DATABASE_URL="$DB"

node scripts/db-check.mjs || true

node scripts/migrate.mjs
npm run db:seed
exec npm start
