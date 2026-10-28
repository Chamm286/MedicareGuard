#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.dump>"
  exit 1
fi

FILE="$1"
CONTAINER="${PG_CONTAINER:-medicareguard-postgres}"
DB="${PG_DATABASE:-medicareguard}"
USER="${PG_USER:-medicare}"
TMP="/tmp/medicareguard-restore.dump"

if [ ! -f "$FILE" ]; then
  echo "Backup file not found: $FILE"
  exit 1
fi

echo "This will replace data in database '$DB'."
read -r -p "Type RESTORE to continue: " answer
if [ "$answer" != "RESTORE" ]; then
  echo "Cancelled."
  exit 1
fi

docker cp "$FILE" "${CONTAINER}:${TMP}"
docker exec "$CONTAINER" pg_restore -U "$USER" -d "$DB" --clean --if-exists --no-owner --no-privileges --single-transaction "$TMP"
docker exec "$CONTAINER" rm -f "$TMP"

echo "Restore completed from: $FILE"
