#!/bin/sh
# سرویس backup: هر روز یک‌بار در ساعت BACKUP_HOUR (به وقت TZ کانتینر)
set -u
HOUR="${BACKUP_HOUR:-03}"
MARKER="${BACKUP_DIR:-/backups}/.last-run"
mkdir -p "${BACKUP_DIR:-/backups}"
while true; do
  today="$(date +%Y%m%d)"
  if [ "$(date +%H)" = "$HOUR" ] && [ "$(cat "$MARKER" 2>/dev/null)" != "$today" ]; then
    if sh /scripts/backup.sh; then
      echo "$today" > "$MARKER"
    else
      echo '{"level":"error","event":"backup_failed"}'
    fi
  fi
  sleep 300
done
