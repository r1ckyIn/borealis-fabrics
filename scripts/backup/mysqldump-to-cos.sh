#!/bin/bash
# Borealis Fabrics - MySQL backup to Tencent COS
# Usage: ./mysqldump-to-cos.sh
# Cron: 0 2 * * * /path/to/mysqldump-to-cos.sh >> /var/log/bf-backup.log 2>&1
#
# Required environment variables:
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#   COS_BUCKET, COS_REGION
#
# Prerequisites: mysqldump, coscli (Tencent COS CLI)
# Retention: keeps last 30 days of backups

set -euo pipefail

# Configuration
BACKUP_DIR="/tmp/borealis-backup"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="borealis_${TIMESTAMP}.sql.gz"

# Validate required env vars
for var in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME COS_BUCKET COS_REGION; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: Required environment variable $var is not set"
    exit 1
  fi
done

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump and compress
mysqldump \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  -p"$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

echo "[$(date)] Dump complete: $FILENAME ($(du -h "$BACKUP_DIR/$FILENAME" | cut -f1))"

# Upload to COS
coscli cp "$BACKUP_DIR/$FILENAME" "cos://$COS_BUCKET/backups/$FILENAME" \
  --region "$COS_REGION"

echo "[$(date)] Uploaded to COS: cos://$COS_BUCKET/backups/$FILENAME"

# Cleanup local file
rm -f "$BACKUP_DIR/$FILENAME"

# Cleanup old COS backups (older than RETENTION_DAYS)
echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)
coscli ls "cos://$COS_BUCKET/backups/" --region "$COS_REGION" | \
  grep "borealis_" | \
  while read -r line; do
    FILE_DATE=$(echo "$line" | grep -o 'borealis_[0-9]*' | sed 's/borealis_//')
    if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
      FILE_PATH=$(echo "$line" | awk '{print $NF}')
      coscli rm "cos://$COS_BUCKET/$FILE_PATH" --region "$COS_REGION" && \
        echo "[$(date)] Deleted old backup: $FILE_PATH"
    fi
  done

echo "[$(date)] Backup complete!"
