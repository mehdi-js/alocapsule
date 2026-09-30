#!/bin/sh
# ─────────────────────────────────────────────────────────────
# بکاپ یک‌باره: دیتابیس (pg_dump فشرده) + فایل‌ها (رسیدهای خصوصی و تصاویر
# محصول). نسخه‌های قدیمی‌تر از BACKUP_RETENTION_DAYS روز حذف می‌شوند.
# متغیرها: PGHOST PGUSER PGPASSWORD PGDATABASE BACKUP_DIR DATA_DIR
# ─────────────────────────────────────────────────────────────
set -eu
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATA_DIR="${DATA_DIR:-/data}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
pg_dump -Fc -f "$BACKUP_DIR/db-$STAMP.dump.partial"
mv "$BACKUP_DIR/db-$STAMP.dump.partial" "$BACKUP_DIR/db-$STAMP.dump"

if [ -d "$DATA_DIR" ]; then
  tar -czf "$BACKUP_DIR/files-$STAMP.tar.gz.partial" -C "$DATA_DIR" .
  mv "$BACKUP_DIR/files-$STAMP.tar.gz.partial" "$BACKUP_DIR/files-$STAMP.tar.gz"
fi

find "$BACKUP_DIR" -maxdepth 1 \( -name 'db-*.dump' -o -name 'files-*.tar.gz' \) \
  -mtime +"$RETENTION" -delete
echo "{\"level\":\"info\",\"event\":\"backup_done\",\"stamp\":\"$STAMP\"}"
