#!/bin/sh
# ─────────────────────────────────────────────────────────────
# سرویس jobs (docker-compose.prod.yml):
#   ۱) صبر تا سالم شدن app، سپس بازسازی کش صفحات (build بدون دیتابیس بوده)
#   ۲) هر ۱۰ دقیقه: تلاش دوباره‌ی پیامک‌های ناموفق
#      هر ساعت: انقضای سفارش‌های پرداخت‌نشده‌ی ۷۲ ساعته
#      هر ۲۴ ساعت: بررسی سلامت مالی (نتیجه در لاگ)
# ─────────────────────────────────────────────────────────────
set -u
APP_URL="${APP_URL:-http://alocapsule-app:3000}"

echo "jobs: waiting for $APP_URL/api/health"
until node -e "fetch('$APP_URL/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do
  sleep 5
done

node -e "
fetch('$APP_URL/api/revalidate', { method: 'POST', headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET ?? '' } })
  .then((r) => console.log(JSON.stringify({ level: 'info', event: 'startup_revalidate', status: r.status })))
  .catch((e) => console.error(JSON.stringify({ level: 'error', event: 'startup_revalidate_failed', message: String(e) })));
"

tick=0
while true; do
  npm run -s job:retry-notifications || true
  if [ $((tick % 6)) -eq 0 ]; then
    npm run -s job:expire-orders || true
  fi
  if [ $((tick % 144)) -eq 0 ]; then
    npm run -s check:finance || echo '{"level":"error","event":"finance_audit_mismatch"}'
  fi
  tick=$((tick + 1))
  sleep 600
done
