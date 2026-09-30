# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# ایمیج چندمرحله‌ای فروشگاه (بخش ۲ سند: Docker + output: standalone)
#   deps    ← نصب وابستگی‌ها (+ prisma generate برای Alpine)
#   builder ← next build بدون دیتابیس (BUILD_WITHOUT_DB=1)
#   tools   ← migration، seed و jobها (tsx + سورس کامل)
#   runner  ← فقط خروجی standalone، کاربر غیر root
# ─────────────────────────────────────────────────────────────
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
# اگر رجیستری npm در دسترس نیست: --build-arg NPM_REGISTRY=<میرور>
ARG NPM_REGISTRY=https://registry.npmjs.org/
# اگر binaries.prisma.sh در دسترس نیست: --build-arg PRISMA_ENGINES_MIRROR=<میرور>
ARG PRISMA_ENGINES_MIRROR
RUN npm config set registry "$NPM_REGISTRY"
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* هنگام build داخل کد قرار می‌گیرد. ALLOW_INDEXING هم لازم است
# چون صفحه‌ی اصلی هنگام build پیش‌رندر می‌شود و متای robots در آن می‌نشیند
# (SEO.md §۸.۳)؛ هنگام اجرا هم از .env.production خوانده می‌شود.
ARG NEXT_PUBLIC_SITE_URL
ARG ALLOW_INDEXING=false
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    ALLOW_INDEXING=$ALLOW_INDEXING \
    NEXT_TELEMETRY_DISABLED=1 \
    BUILD_WITHOUT_DB=1
RUN npm run build

FROM builder AS tools
ENV NODE_ENV=production \
    BUILD_WITHOUT_DB=0
CMD ["npx", "prisma", "migrate", "deploy"]

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl \
 && addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PRIVATE_STORAGE_DIR=/app/storage/private
# postbuild، public و static را داخل standalone کپی کرده است
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
RUN mkdir -p /app/storage/private /app/public/uploads \
 && chown -R nextjs:nodejs /app/storage /app/public/uploads
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
