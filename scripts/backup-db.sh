#!/usr/bin/env bash
# Full database backup using pg_dump (PostgreSQL client tools must be installed).
#   npm run backup:db            -> backups/guitarz4u-YYYY-MM-DD-HHMM.dump
# Restore with:  pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/<file>.dump
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${DATABASE_URL:-}" ] && [ -f .env.local ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')
fi
: "${DATABASE_URL:?Set DATABASE_URL (or add it to .env.local)}"
mkdir -p backups
FILE="backups/guitarz4u-$(date +%Y-%m-%d-%H%M).dump"
pg_dump --format=custom --no-owner --no-privileges --schema=public "$DATABASE_URL" -f "$FILE"
echo "✔ Backup written to $FILE ($(du -h "$FILE" | cut -f1)). Keep it somewhere safe and private."
