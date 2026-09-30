#!/bin/sh
# ─────────────────────────────────────────────────────────────
# بازگردانی: sh restore.sh /backups/db-XXXX.dump [/backups/files-XXXX.tar.gz]
# ⚠️ دیتابیس فعلی بازنویسی می‌شود. پیش از اجرا app و jobs را متوقف کنید
# (راهنما در DEPLOYMENT.md).
# ─────────────────────────────────────────────────────────────
set -eu
DB_DUMP="${1:?مسیر فایل db-*.dump را بدهید}"
FILES_ARCHIVE="${2:-}"
DATA_DIR="${DATA_DIR:-/data}"

pg_restore --clean --if-exists --no-owner --exit-on-error -d "$PGDATABASE" "$DB_DUMP"
echo '{"level":"info","event":"restore_db_done"}'

if [ -n "$FILES_ARCHIVE" ]; then
  tar -xzf "$FILES_ARCHIVE" -C "$DATA_DIR"
  echo '{"level":"info","event":"restore_files_done"}'
fi
