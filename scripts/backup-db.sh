#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${PG_CONTAINER:-medicareguard-postgres}"
DB="${PG_DATABASE:-medicareguard}"
USER="${PG_USER:-medicare}"
DIR="${BACKUP_DIR:-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TMP="/tmp/medicareguard-${STAMP}.dump"
FILE="${DIR}/medicareguard-${STAMP}.dump"

mkdir -p "$DIR"
docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DB" -Fc -f "$TMP"
docker cp "${CONTAINER}:${TMP}" "$FILE"
docker exec "$CONTAINER" rm -f "$TMP"

echo "Backup created: $FILE"
ls -lh "$FILE"
