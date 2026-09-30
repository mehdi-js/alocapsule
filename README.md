# فروشگاه آنلاین الو کپسول

وب‌اپ فروشگاهی کپسول گاز و خدمات شارژ — Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + PostgreSQL 16 + Prisma.

فروشگاه هم **کالای فیزیکی** (خرید کپسول نو، پیک‌نیک) می‌فروشد و هم **خدمت** (شارژ کپسول با تعویض کپسول پرشده)؛ محصول می‌تواند قیمت‌دار یا استعلامی باشد؛ ارسال با پیک یا تحویل حضوری (فقط تهران).

قرارداد فنی و وضعیت فعلی پروژه در [ARCHITECTURE.md](./ARCHITECTURE.md) است (بخش «وضعیت الو کپسول»). طراحی و توکن‌ها: [docs/DESIGN_TOKENS.md](./docs/DESIGN_TOKENS.md). منشأ فورک: [docs/FORK_ORIGIN.md](./docs/FORK_ORIGIN.md).

## پیش‌نیازها

- Node.js ‏22.12 یا بالاتر
- npm
- Docker (برای Postgres توسعه)

## راه‌اندازی محلی

```bash
# ۱) نصب وابستگی‌ها
npm install

# ۲) ساخت فایل محیطی و مقداردهی AUTH_SECRET (حداقل ۳۲ کاراکتر)
cp .env.example .env

# ۳) بالا آوردن Postgres (روی 127.0.0.1:5436)
docker compose up -d

# ۴) ساخت جدول‌ها و داده‌ی نمونه (ADMIN_SEED_PHONE را در .env به شماره‌ی خودتان تغییر دهید)
npm run db:migrate
npm run db:seed

# ۵) اجرای سرور توسعه
npm run dev
```

سایت روی <http://localhost:3000> در دسترس است.

`db:seed` قابل تکرار است (upsert) و ۴ دسته و ۴ محصول **نمونه** (شارژ بوتان، کپسول ۱۱ کیلویی، پیک‌نیک، شارژ اکسیژن استعلامی)، دو روش ارسال (پیک و تحویل حضوری) و کلیدهای تنظیمات را می‌سازد. محتوای واقعی کاتالوگ با `SEO.md` می‌آید. برای پاک‌سازی کامل دیتابیس توسعه و شروع دوباره (همه‌ی داده پاک می‌شود):

```bash
npm run db:reset
```

## اسکریپت‌ها

| دستور                                | کار                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `npm run dev`                        | سرور توسعه                                                                          |
| `npm run build`                      | ساخت production (`output: "standalone"`)                                            |
| `npm start`                          | اجرای خروجی standalone (بعد از `build`)                                             |
| `npm run typecheck`                  | بررسی نوع TypeScript                                                                |
| `npm run lint`                       | ESLint                                                                              |
| `npm run format`                     | قالب‌بندی با Prettier (`format:check` فقط بررسی)                                    |
| `npm test`                           | تست‌های واحد (Vitest)                                                               |
| `npm run test:integration`           | تست‌های یکپارچه روی Postgres توسعه                                                  |
| `npm run test:e2e`                   | تست‌های Playwright (Postgres + seed لازم است؛ `E2E_ADMIN_PHONE=<ADMIN_SEED_PHONE>`) |
| `npm run db:migrate`                 | اجرای migrationهای Prisma                                                           |
| `npm run db:seed`                    | داده‌ی نمونه                                                                        |
| `npm run db:reset`                   | پاک‌سازی و ساخت دوباره‌ی دیتابیس توسعه (migration + seed)                           |
| `npm run db:seed:demo`               | سفارش‌های نمایشی برای گزارش‌ها (فقط توسعه؛ `-- --clean`)                            |
| `npm run db:studio`                  | Prisma Studio                                                                       |
| `npm run check:finance`              | بررسی سلامت مالی (`check:wallet` فقط کیف پول)                                       |
| `npm run job:expire-orders`          | لغو سفارش‌های پرداخت‌نشده‌ی ۷۲ ساعته                                                |
| `npm run job:retry-notifications`    | تلاش دوباره‌ی پیامک‌های ناموفق                                                      |
| `npm run user:set-password -- 0912…` | تعیین رمز عبور کاربر از روی سرور (بازیابی بدون پیامک)                               |

استقرار production: [DEPLOYMENT.md](./DEPLOYMENT.md).

پیش از هر commit این سه دستور باید بدون خطا اجرا شوند:

```bash
npm run typecheck && npm run lint && npm run build
```

## میرور npm (سرور/شبکه‌ی ایران)

اگر `npm install` به خطا خورد یا بسیار کند بود، از یک میرور ایرانی npm استفاده کنید:

```bash
# فقط برای همین پروژه
npm config set registry <آدرس-میرور-npm> --location=project

# یا برای یک بار اجرا
npm install --registry <آدرس-میرور-npm>
```

> آدرس میرور را از ارائه‌دهنده‌ی خود (مثلاً لیارا یا آروان) بگیرید.
> فایل `.npmrc` پروژه commit نشود مگر تیم روی آدرس مشخصی توافق کرده باشد.

## ورود با OTP و پیامک

- در توسعه `SMS_PROVIDER=console` است: کد تأیید در ترمینالِ `npm run dev` چاپ می‌شود (`[SMS:console] … args=["123456"]`). در production این حالت عمداً خطا می‌دهد.
- برای پیامک واقعی: `SMS_PROVIDER=melipayamak` و مقادیر `MELIPAYAMAK_*` و `SMS_PATTERN_OTP` را در `.env` بگذارید. الگوی OTP باید از قبل در پنل ملی پیامک ثبت و تأیید شده باشد.
- rate limit مبتنی بر IP از هدر `x-forwarded-for` / `x-real-ip` می‌خواند؛ فقط پشت reverse proxy که این هدر را خودش تنظیم می‌کند قابل اتکاست.

## تصاویر و ذخیره‌سازی فایل

- `STORAGE_DRIVER=local` (پیش‌فرض): فایل‌ها در `public/uploads/` نوشته و از `/api/media/*` سرو می‌شوند. در Docker این پوشه باید **volume** باشد، وگرنه با هر deploy پاک می‌شود.
- `STORAGE_DRIVER=s3` (آروان یا هر S3-compatible): `S3_ENDPOINT`، `S3_BUCKET`، `S3_ACCESS_KEY` و `S3_SECRET_KEY` را بگذارید؛ در صورت نیاز `S3_REGION` و `S3_PUBLIC_URL` (دامین CDN). دسترسی **خواندن عمومی** باید روی خود bucket فعال باشد. `next.config.ts` هنگام **build** دامنه‌ی S3 را می‌خواند؛ با تغییر آن دوباره build کنید.
- هر تصویر آپلودی به WebP تبدیل می‌شود (حداکثر ۱۶۰۰px) و thumbnail ۴۰۰px دارد؛ حداکثر ۵MB و ۱۰ تصویر برای هر محصول.

## طراحی و محتوای ثابت

- تم روشن و نارنجی؛ همه‌ی رنگ‌ها توکن معنایی در `@theme` فایل `src/app/globals.css` هستند (هیچ کامپوننتی رنگ خام نمی‌نویسد) و جدول کنتراست در `docs/DESIGN_TOKENS.md` است.
- نام برند فقط در `src/lib/brand.ts` نوشته می‌شود (`SITE` در `src/lib/site-content.ts` از آن می‌خواند).
- متن‌های صفحه‌ی اصلی، تماس، تحویل حضوری و شرایط خدمت از «تنظیمات ← صفحه‌ی اصلی» و «کسب‌وکار و خدمت» در پنل ادمین ویرایش می‌شوند؛ ادعای واقعی کسب‌وکار در کد/seed با `{{تکمیل توسط الو کپسول: …}}` علامت‌گذاری شده و باید پر شود.
- لوگو و favicon جای‌نگهدارند (`public/brand/logo.svg`، `src/app/icon.svg`) تا فایل نهایی برسد.

## قواعد مهم

- هیچ درخواستی به دامنه‌ی خارجی (Google Fonts، CDN و …) در runtime نباید ارسال شود. فونت وزیرمتن داخل `public/fonts` است (لایسنس OFL کنار آن است).
- هیچ منطق موجودی/انبارداری در نسخه ۱ وجود ندارد؛ فقط `isActive`.
- تمام متن‌های UI فارسی و راست‌چین؛ نام متغیر/فایل/جدول/فیلد انگلیسی.
