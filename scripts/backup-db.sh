#!/usr/bin/env bash
# Full PostgreSQL backup (schema + data, including files stored with STORAGE_DRIVER=db).
# Usage: DATABASE_URL=... npm run db:backup   → backups/telefonuzb-YYYYmmdd-HHMMSS.dump
# Restore: pg_restore --clean --if-exists -d "$DATABASE_URL" backups/<file>.dump
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"
mkdir -p backups
OUT="backups/telefonuzb-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --no-privileges "${DATABASE_URL%%\?*}" -f "$OUT"
echo "✓ backup saved to $OUT"
# keep the 14 most recent backups
ls -1t backups/telefonuzb-*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
