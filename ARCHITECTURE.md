# ARCHITECTURE.md — فروشگاه آنلاین علی‌حان (ALIHAN)

> در این پروژه `FORK.md` مقدم است.

> این سند، قرارداد فنی پروژه است. Claude Code باید **فاز به فاز** پیش برود و هیچ فازی را قبل از تکمیل و تأیید فاز قبلی شروع نکند.
>
> نسخه‌ی سند: ۳ — شامل کد تخفیف و اعلان پیامکی (ملی پیامک). **سیستم مدیریت موجودی و انبارداری عمداً حذف شده است.**

---

## 0. قوانین کار برای Claude Code (مهم — قبل از هر کاری بخوان)

1. **یک فاز در هر زمان.** در پایان هر فاز توقف کن، خلاصه‌ی کارهای انجام‌شده + خروجی `typecheck`/`lint`/`build` را گزارش بده و منتظر تأیید بمان.
2. **هیچ‌وقت فاز بعدی را "چون منطقی بود" جلو نینداز.** اگر چیزی در فاز فعلی به نظرت لازم است ولی در لیست فاز نیست، اول بپرس.
3. بعد از هر فاز این سه دستور باید بدون خطا اجرا شوند:
   ```bash
   npm run typecheck && npm run lint && npm run build
   ```
4. **بعد از هر فاز یک commit** با پیام `phase-N: <عنوان فاز>`.
5. اگر یک تصمیم فنی در این سند مشخص نشده، **حدس نزن** — بپرس و بعد از پاسخ، همان تصمیم را به انتهای این فایل در بخش «تصمیمات تکمیلی» اضافه کن.
6. **هیچ TODO یا کد نیمه‌کاره** در پایان فاز باقی نماند. فاز یا کامل است یا شروع نشده.
7. تمام متن‌های UI فارسی و راست‌چین. نام متغیر/فایل/جدول/فیلد **انگلیسی**.
8. هر فایلی بیش از ~۳۰۰ خط شد، بشکن.
9. هیچ کتابخانه‌ای اضافه نکن مگر در این سند آمده باشد یا قبلش تأیید بگیری.
10. 🔴 **هیچ منطق موجودی/انبارداری اضافه نکن.** نه فیلد، نه چک، نه شمارنده. جزئیات در بخش ۷.۱.

---

## 1. هدف و دامنه‌ی پروژه

جایگزینی سایت فعلی وردپرس/ووکامرس با یک وب‌اپ فروشگاهی سبک، سریع و کاملاً تحت کنترل، برای فروش آنلاین باقلوا و شیرینی برند علی‌حان.

### مشکلاتی که باید حل شوند
- کندی و سنگینی ناشی از افزونه‌های متعدد وردپرس
- تعارض و شکستن سایت هنگام آپدیت‌ها
- امکانات اضافه و بلااستفاده

### معیارهای موفقیت نسخه ۱
- بارگذاری صفحه محصول زیر ۱.۵ ثانیه روی اینترنت موبایل ایران
- Lighthouse Performance ≥ ۹۰ روی موبایل
- کل مسیر «ورود → سبد → کد تخفیف → ثبت سفارش → پیامک → آپلود رسید → تأیید ادمین → پیامک» بدون خطا
- امکان بالا آمدن سایت روی یک VPS معمولی بدون وابستگی خارجی

---

## 2. تصمیمات قفل‌شده (Locked Decisions)

| موضوع | تصمیم | دلیل |
|---|---|---|
| میزبانی | سرور ایران (لیارا / آروان / VPS ایران) | سرعت برای کاربر ایرانی، بدون تحریم |
| ورود کاربر | ثبت‌نام با OTP پیامکی؛ سپس ورود با رمز عبور **یا** OTP (تصمیم ۱۴۰۵/۰۷/۰۲ در §۱۱) | استاندارد ایران + ورود بدون وابستگی به سرویس پیامک |
| سرویس پیامک | **ملی پیامک (Melipayamak)** | انتخاب کارفرما |
| مهاجرت داده | ندارد — از صفر | سرعت بالا آمدن |
| مدیریت موجودی | **ندارد** | همه‌ی محصولات همیشه موجود فرض می‌شوند |
| فریم‌ورک | Next.js 15 (App Router) + React 19 | |
| زبان | TypeScript با `strict: true` | |
| استایل | Tailwind CSS v4 | |
| دیتابیس | PostgreSQL 16 | |
| ORM | Prisma | |
| اعتبارسنجی | Zod (در مرز ورودی‌ها) | |
| چارت ادمین | Recharts | |
| Deploy | Docker + `output: "standalone"` | |

### قواعد بحرانی ناشی از «سرور ایران»
این موارد **غیرقابل مذاکره** هستند:

- ❌ هیچ استفاده‌ای از Google Fonts / CDN خارجی / unpkg / jsdelivr در runtime.
- ✅ فونت **وزیرمتن (Vazirmatn)** به‌صورت `woff2` داخل `/public/fonts` و لود با `next/font/local`.
- ❌ هیچ API مخصوص Vercel (Edge Runtime، `@vercel/*`, ISR وابسته به Vercel).
- ✅ `next.config.ts` با `output: "standalone"`.
- ✅ بهینه‌سازی تصویر با `sharp` روی خود سرور.
- ⚠️ اگر `npm install` به خطا خورد، از میرور ایرانی npm استفاده شود (در README مستند شود).

---

## 3. دامنه‌ی نسخه‌ها

### ✅ نسخه ۱ (این سند)
- فروشگاه: لیست محصولات، دسته‌بندی، صفحه محصول، جستجو
- متغیر محصول بر پایه‌ی وزن/تعداد (بخش ۶.۱) — **بدون موجودی**
- سبد خرید (مهمان + کاربر)
- ورود/ثبت‌نام با OTP پیامکی
- کد تخفیف (درصدی / مبلغ ثابت / ارسال رایگان)
- پنل کاربر: سفارش‌ها، آدرس‌ها، کیف پول
- پرداخت **کارت به کارت** + آپلود رسید + تأیید ادمین
- کیف پول (شارژ توسط ادمین، پرداخت از کیف پول)
- اعلان پیامکی به مشتری: ثبت سفارش، تأیید رسید، رد رسید، ارسال سفارش
- داشبورد ادمین:
  - مدیریت محصولات (CRUD + دسته‌بندی + تصاویر + متغیرها)
  - مدیریت کدهای تخفیف
  - مدیریت سفارش‌ها و تأیید رسیدها
  - مدیریت کاربران + مدیریت موجودی کیف پول
  - گزارش‌گیری: جدول + نمودار فروش به تفکیک بازه زمانی
- تنظیمات پایه (کارت شرکت، هزینه ارسال، متن پیامک‌ها، اطلاعات تماس)

### 🔜 نسخه ۲ (فقط جای آن باز بماند — **پیاده‌سازی نشود**)
- درگاه پرداخت آنلاین با verify (زرین‌پال/آیدی‌پی)
- وبلاگ و مدیریت مقالات
- **مدیریت موجودی و انبارداری**
- باشگاه مشتریان و امتیاز
- کمپین و تخفیف زمان‌دار خودکار
- وزن آزاد (ورود دلخواه وزن توسط مشتری)

> **قاعده:** هر جا نسخه ۲ اثر معماری دارد (مثل `Payment.method`)، فقط **enum/فیلد** اضافه می‌شود، نه کد.

---

## 4. استک و ساختار پوشه‌ها

```
alihan-shop/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── fonts/            # Vazirmatn woff2
│   └── uploads/          # (اگر storage محلی باشد)
├── src/
│   ├── app/
│   │   ├── (shop)/               # فروشگاه — layout عمومی
│   │   │   ├── page.tsx           # صفحه اصلی
│   │   │   ├── products/
│   │   │   ├── category/[slug]/
│   │   │   ├── cart/
│   │   │   └── checkout/
│   │   ├── (account)/account/    # پنل کاربر — نیازمند لاگین
│   │   ├── (admin)/admin/        # داشبورد ادمین — نیازمند نقش ADMIN
│   │   ├── (auth)/login/
│   │   ├── api/                  # فقط برای upload / media / health
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # المان‌های پایه (Button, Input, Modal...)
│   │   ├── shop/
│   │   └── admin/
│   ├── server/
│   │   ├── actions/              # Server Actions (هر دامنه یک فایل)
│   │   ├── services/             # منطق کسب‌وکار خالص
│   │   ├── repositories/         # دسترسی به Prisma
│   │   └── auth/
│   ├── lib/
│   │   ├── db.ts                 # Prisma singleton
│   │   ├── money.ts              # فرمت و محاسبه مبلغ
│   │   ├── date.ts               # تبدیل و فرمت شمسی
│   │   ├── phone.ts              # نرمال‌سازی شماره موبایل
│   │   ├── unit.ts               # عنوان خودکار متغیر و قیمت هر کیلو
│   │   ├── sms/                  # adapter پیامک (ملی پیامک)
│   │   ├── storage/              # adapter ذخیره فایل
│   │   └── validation/           # اسکیماهای Zod
│   ├── types/
│   └── middleware.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── ARCHITECTURE.md
```

### قواعد معماری کد
- **Server Component پیش‌فرض.** `"use client"` فقط وقتی state/event لازم است.
- تمام mutationها با **Server Action** — نه `fetch` به route handler.
- هر Server Action دقیقاً این ترتیب را دارد:
  `1) احراز هویت و نقش → 2) اعتبارسنجی Zod → 3) صدا زدن service → 4) خروجی typed → 5) revalidatePath`
- **هیچ‌وقت Prisma مستقیم در کامپوننت صدا زده نشود.** مسیر: `component → action → service → repository → prisma`
- هیچ Server Action هرگز خروجی خام Prisma با فیلدهای حساس برنگرداند (DTO بساز).

---

## 5. قواعد بومی‌سازی (Iran-specific)

| موضوع | قاعده |
|---|---|
| واحد پول | **تومان**، همیشه `Int` (هیچ‌وقت float). نمایش با جداکننده هزارگان فارسی. |
| تاریخ | ذخیره `timestamptz` به UTC، نمایش **شمسی** با `dayjs` + `jalaliday` در `lib/date.ts` |
| شماره موبایل | نرمال‌سازی به `09XXXXXXXXX`؛ تبدیل ارقام فارسی/عربی به لاتین **قبل از** ذخیره |
| جهت | `<html lang="fa" dir="rtl">` |
| اعداد در UI | تابع مشترک `toPersianDigits()` |
| کد تخفیف | نرمال‌سازی: حروف بزرگ لاتین، حذف فاصله، تبدیل ارقام فارسی به لاتین |
| جستجو | `ILIKE` + ایندکس `pg_trgm` روی نام محصول، با حذف نیم‌فاصله و یکسان‌سازی ی/ک عربی |

---

## 6. مدل داده (Prisma Schema)

> در فاز ۱ کل این اسکیما یکجا ساخته می‌شود تا بعداً migration های شکننده نداشته باشیم.

---

### 6.1 مدل متغیر محصول

محصولات دو نوع واحد فروش دارند: برخی **وزنی** (گرم) و برخی **تعدادی** (عدد). مشتری فقط یکی از این متغیرها را انتخاب می‌کند؛ ترکیب داخلی محصول (گردویی/پسته‌ای) در سایت نمایش داده نمی‌شود.

```
Product
 ├── unit: GRAM | PIECE       ← واحد فروش
 └── Variants[]
      ├── unitValue: Int      ← 500 / 1000 / 12 ...
      ├── price: Int
      └── shippingWeightGrams: Int
```

**`unitValue` فقط برای نمایش و محاسبه‌ی وزن ارسال است — هیچ ربطی به موجودی ندارد.**

**قواعد:**
1. هر محصول حداقل یک variant دارد.
2. `unique(productId, unitValue)` — دو variant با مقدار یکسان ممنوع.
3. قیمت فقط روی variant است، نه روی محصول.
4. در دسترس بودن فقط با `isActive` کنترل می‌شود (بخش ۷.۱).

**عنوان خودکار متغیر** (در `lib/unit.ts`، قابل بازنویسی دستی توسط ادمین):

| unit | unitValue | عنوان تولیدی |
|---|---|---|
| GRAM | 250 | ۲۵۰ گرم |
| GRAM | 500 | ۵۰۰ گرم |
| GRAM | 1000 | ۱ کیلوگرم |
| GRAM | 1500 | ۱.۵ کیلوگرم |
| PIECE | 1 | ۱ عددی |
| PIECE | 12 | ۱۲ عددی |

**قیمت هر کیلو** برای محصولات `GRAM` محاسبه و زیر قیمت نمایش داده می‌شود:
`pricePerKg = round(price / unitValue × 1000)`

**وزن ارسال** روی هر variant جداگانه ذخیره می‌شود (`shippingWeightGrams`)، چون یک جعبه‌ی «۱۲ عددی» هم وزن دارد. برای محصولات `GRAM` مقدار پیش‌فرض پیشنهادی `unitValue + وزن بسته‌بندی` است ولی ادمین می‌تواند تغییرش دهد.

---

### 6.2 Enums

```prisma
enum UserRole { CUSTOMER ADMIN }

enum ProductUnit { GRAM PIECE }

enum OrderStatus {
  PENDING_PAYMENT      // ثبت شده، منتظر پرداخت
  PAYMENT_REVIEW       // رسید آپلود شده، منتظر بررسی ادمین
  PAYMENT_REJECTED     // رسید رد شد
  PROCESSING           // تأیید شد، در حال آماده‌سازی
  SHIPPED              // ارسال شد
  DELIVERED            // تحویل شد
  CANCELED             // لغو شد
}

enum PaymentMethod { CARD_TO_CARD WALLET GATEWAY }   // GATEWAY فقط برای v2

enum PaymentStatus { PENDING SUBMITTED APPROVED REJECTED }

enum WalletTxType { CREDIT DEBIT }

enum CouponType { PERCENT FIXED FREE_SHIPPING }

enum CouponScope { ALL CATEGORY PRODUCT }

enum NotificationType {
  ORDER_PLACED
  PAYMENT_APPROVED
  PAYMENT_REJECTED
  ORDER_SHIPPED
}

enum NotificationStatus { PENDING SENT FAILED }
```

### 6.3 موجودیت‌ها

**User** — `id`, `phone` (unique, index), `fullName?`, `email?`, `role`, `walletBalance` (Int، کش‌شده), `isActive`, `createdAt`, `updatedAt`

**OtpCode** — `id`, `phone` (index), `codeHash`, `expiresAt`, `attempts`, `consumedAt?`, `ip?`, `createdAt`
> کد خام هرگز ذخیره نمی‌شود — فقط hash.

**Session** — `id`, `userId`, `tokenHash`, `expiresAt`, `userAgent?`, `createdAt`, `revokedAt?`

**Category** — `id`, `name`, `slug` (unique), `parentId?`, `description?`, `imageUrl?`, `sortOrder`, `isActive`

**Product** — `id`, `name`, `slug` (unique), `shortDescription?`, `description?`, `categoryId`, `unit` (ProductUnit), `isActive`, `sortOrder`, `metaTitle?`, `metaDescription?`, `createdAt`, `updatedAt`
> 🔴 **بدون هیچ فیلد موجودی.**

**ProductVariant** — `id`, `productId`, `unitValue` (Int), `title?` (اگر خالی، خودکار تولید می‌شود), `sku?`, `price` (Int، تومان), `comparePrice?`, `shippingWeightGrams` (Int), `isActive`, `sortOrder`
> `unique(productId, unitValue)` · 🔴 **بدون هیچ فیلد موجودی.**

**ProductImage** — `id`, `productId`, `url`, `alt?`, `sortOrder`, `isPrimary`

**Address** — `id`, `userId`, `receiverName`, `receiverPhone`, `province`, `city`, `postalCode?`, `line`, `isDefault`

**Cart** / **CartItem**
- `Cart`: `id`, `token` (unique), `userId?`, `couponCode?`, `createdAt`, `updatedAt`
- `CartItem`: `id`, `cartId`, `variantId`, `quantity`

**Coupon** — `id`, `code` (unique، نرمال‌شده), `title`, `type` (CouponType), `value` (Int — درصد یا تومان), `maxDiscountAmount?` (Int — سقف تخفیف درصدی), `minOrderAmount?` (Int), `scope` (CouponScope), `usageLimitTotal?` (Int), `usageLimitPerUser?` (Int), `usedCount` (Int، پیش‌فرض ۰), `firstOrderOnly` (Boolean), `startsAt?`, `expiresAt?`, `isActive`, `createdByUserId?`, `createdAt`

**CouponCategory** — `couponId`, `categoryId` · **CouponProduct** — `couponId`, `productId`
> فقط وقتی `scope != ALL` پر می‌شوند.

**CouponRedemption** — `id`, `couponId`, `userId`, `orderId`, `discountAmount`, `createdAt`
> `unique(couponId, orderId)` · `index(couponId, userId)` — این unique جلوی ثبت دوباره در شرایط رقابتی را می‌گیرد.

**Order** — `id`, `orderNumber` (unique، خوانا مثل `AL-14040625-0031`), `userId`, `status`, `subtotal`, `shippingTotal`, `discountTotal`, `grandTotal`, `couponId?`, `couponCode?` (اسنپ‌شات), `shippingMethodName` (اسنپ‌شات), `shippingAddressSnapshot` (Json), `customerNote?`, `adminNote?`, `trackingCode?`, `placedAt`, `paidAt?`, `shippedAt?`, `canceledAt?`

> **فرمول واحد و همیشگی:** `grandTotal = subtotal + shippingTotal − discountTotal`

**OrderItem** — `id`, `orderId`, `variantId?`, `productId?`, `productName`, `variantTitle`, `unitPrice`, `quantity`, `lineTotal`, `unitValueSnapshot`, `unitSnapshot`
> **اسنپ‌شات کامل** است. اگر بعداً محصول حذف یا قیمتش عوض شد، سفارش قدیمی نباید تغییر کند.

**Payment** — `id`, `orderId`, `method`, `amount`, `status`, `receiptImageUrl?`, `payerCardLast4?`, `referenceNumber?`, `paidAtClaimed?`, `reviewedByUserId?`, `reviewedAt?`, `rejectReason?`, `createdAt`

**WalletTransaction** — `id`, `userId`, `type`, `amount` (همیشه مثبت), `balanceAfter`, `reason` (`ADMIN_CREDIT` | `ORDER_PAYMENT` | `ORDER_REFUND`), `orderId?`, `createdByUserId?`, `note?`, `createdAt`
> **دفتر کل (ledger) و منبع حقیقت است.** `User.walletBalance` فقط کش است.

**NotificationLog** — `id`, `userId?`, `phone`, `type` (NotificationType), `orderId?`, `status` (NotificationStatus), `providerMessageId?`, `payload` (Json), `errorMessage?`, `attempts` (Int), `createdAt`, `sentAt?`
> `unique(orderId, type)` — تضمین می‌کند یک پیامک برای یک رویداد فقط یک‌بار فرستاده شود.

**CompanyBankCard** — `id`, `bankName`, `cardNumber`, `shebaNumber?`, `accountHolderName`, `isActive`, `sortOrder`
> شماره کارت **در دیتابیس** است نه در کد یا env.

**ShippingMethod** — `id`, `name`, `description?`, `cost` (Int), `freeAboveAmount?` (Int), `isActive`, `sortOrder`

**OrderStatusHistory** — `id`, `orderId`, `fromStatus?`, `toStatus`, `changedByUserId?`, `note?`, `createdAt`

**AuditLog** — `id`, `actorUserId`, `action`, `entityType`, `entityId`, `metadata` (Json), `createdAt`

**Setting** — `key` (unique), `value` (Json), `updatedAt`

### 6.4 ایندکس‌های الزامی
`User.phone` · `OtpCode.phone` · `Product.slug` · `Product.categoryId` · `Category.slug` · `ProductVariant.productId` · `Coupon.code` · `CouponRedemption(couponId, userId)` · `Order.userId` · `Order.status` · `Order.placedAt` · `Payment.status` · `WalletTransaction.userId` · `NotificationLog.status` · ایندکس GIN trigram روی `Product.name`

---

## 7. قواعد بحرانی منطق کسب‌وکار

### ۷.۱ 🔴 عدم مدیریت موجودی — تصمیم صریح

**همه‌ی محصولات همیشه موجود فرض می‌شوند.** این یک تصمیم آگاهانه‌ی کسب‌وکاری است، نه یک قابلیت فراموش‌شده.

**آنچه ساخته نمی‌شود:**
- ❌ هیچ فیلد `stock` / `quantity` / `inventory` روی محصول یا variant
- ❌ هیچ چک موجودی هنگام افزودن به سبد یا ثبت سفارش
- ❌ هیچ کسر یا برگشت موجودی هنگام ثبت / لغو سفارش / رد رسید
- ❌ هیچ قفل ردیف (`SELECT ... FOR UPDATE`) روی محصولات
- ❌ هیچ وضعیت «ناموجود» یا «تمام شده» در UI
- ❌ هیچ هشدار موجودی رو به اتمام در داشبورد

**آنچه جایگزین آن است:**
- ✅ اگر محصولی موقتاً قابل فروش نیست، ادمین `isActive` محصول یا variant را **خاموش** می‌کند. یک کلید، بدون محاسبه.
- ✅ محصول یا variant غیرفعال در فروشگاه دیده نمی‌شود و اگر در سبد کسی باشد، هنگام تسویه با پیام فارسی حذف می‌شود.
- ✅ **سقف تعداد در هر خط سبد**: یک عدد ثابت از `Setting` (پیش‌فرض ۹۹). این انبارداری نیست — فقط جلوی خطای تایپ مشتری را می‌گیرد.

> اگر در آینده انبارداری لازم شد، به نسخه ۲ موکول است و نیازی به تغییر اسکیمای فعلی ندارد؛ فقط فیلدهای جدید اضافه می‌شود.

### ۷.۲ قیمت
- قیمت نهایی **همیشه سمت سرور** از دیتابیس دوباره محاسبه می‌شود. هیچ‌وقت به قیمتی که کلاینت فرستاده اعتماد نشود.

### ۷.۳ کد تخفیف

**اعتبارسنجی** (تابع مرکزی `validateCoupon(code, cart, user)`):
```
۱. کد پس از نرمال‌سازی وجود دارد و isActive است
۲. بازه‌ی زمانی: startsAt ≤ now ≤ expiresAt
۳. minOrderAmount ≤ subtotal
۴. usedCount < usageLimitTotal
۵. تعداد استفاده‌ی این کاربر < usageLimitPerUser
۶. اگر firstOrderOnly: کاربر هیچ سفارش پرداخت‌شده‌ای نداشته باشد
۷. اگر scope != ALL: حداقل یک آیتم سبد مشمول باشد
```

**محاسبه‌ی مبلغ:**
| نوع | فرمول |
|---|---|
| `PERCENT` | `min(eligibleSubtotal × value ÷ 100, maxDiscountAmount ?? ∞)` |
| `FIXED` | `min(value, eligibleSubtotal)` |
| `FREE_SHIPPING` | `discountTotal = shippingTotal` |

> `eligibleSubtotal` = جمع خطوطی که در دامنه‌ی کوپن هستند (برای `ALL` برابر کل `subtotal`).

**قواعد الزامی:**
- 🔴 اعتبارسنجی **دو بار** انجام می‌شود: یک‌بار در سبد برای نمایش، و **دوباره داخل تراکنش ثبت سفارش**.
- `discountTotal` هرگز از `subtotal + shippingTotal` بیشتر و هرگز منفی نشود.
- افزایش `usedCount` و ساخت `CouponRedemption` **داخل همان تراکنش ثبت سفارش**. یکتایی `(couponId, orderId)` از ثبت دوباره جلوگیری می‌کند.
- هنگام **لغو سفارش (`CANCELED`)**: `CouponRedemption` حذف و `usedCount` کم می‌شود.
- هنگام **رد رسید (`PAYMENT_REJECTED`)**: کوپن **آزاد نمی‌شود**، چون کاربر می‌تواند رسید جدید بفرستد و همان سفارش را ادامه دهد.
- کد کوپن روی سفارش **اسنپ‌شات** می‌شود (`couponCode`) تا حذف کوپن، سفارش قدیمی را نشکند.

### ۷.۴ کیف پول
- هر تغییر موجودی = **یک ردیف در `WalletTransaction` + آپدیت `User.walletBalance`** داخل یک تراکنش واحد.
- هیچ‌جا `walletBalance` مستقیم و بدون ثبت تراکنش آپدیت نشود.
- پرداخت از کیف پول فقط اگر `walletBalance >= grandTotal`.
- شارژ کیف پول فقط توسط ادمین (v1)، با ثبت اجباری در `AuditLog`.

### ۷.۵ گردش کار پرداخت کارت به کارت
```
کاربر سفارش ثبت می‌کند
   └─> Order(PENDING_PAYMENT) + Payment(PENDING) + ثبت کوپن
   └─> 📱 پیامک «سفارش ثبت شد»
کاربر اطلاعات کارت شرکت را می‌بیند و واریز می‌کند
کاربر رسید + شماره پیگیری + ۴ رقم آخر کارت را آپلود می‌کند
   └─> Payment(SUBMITTED) + Order(PAYMENT_REVIEW)
ادمین در داشبورد بررسی می‌کند:
   ├─ تأیید ─> Payment(APPROVED) + Order(PROCESSING) + paidAt + AuditLog
   │          └─> 📱 پیامک «پرداخت تأیید شد»
   └─ رد    ─> Payment(REJECTED) + Order(PAYMENT_REJECTED) + rejectReason + AuditLog
              └─> 📱 پیامک «رسید تأیید نشد»
              (کاربر می‌تواند رسید جدید آپلود کند → برمی‌گردد به SUBMITTED)
```
- تأیید/رد باید **idempotent** باشد: اگر ادمین دوبار کلیک کرد، اثر مالی و پیامک دوباره اعمال نشود.
- سفارش‌های `PENDING_PAYMENT` که بیش از **۷۲ ساعت** بدون رسید بمانند، توسط `npm run job:expire-orders` لغو می‌شوند؛ کوپن آزاد می‌شود. (فاز ۱۳)

### ۷.۶ اعلان پیامکی — ملی پیامک

**Adapter:** `lib/sms/` با اینترفیس `SmsProvider` و دو پیاده‌سازی: `ConsoleSmsProvider` و `MelipayamakProvider`.

⚠️ **Claude Code:** جزئیات دقیق endpoint و پارامترها را از مستندات فعلی ملی پیامک بخوان و حدس نزن. نکات زیر مربوط به شکل کلی سرویس است و باید تأیید شود:
- ارسال مبتنی بر **الگو (Pattern / bodyId)** برای پیامک خدماتی استفاده می‌شود، نه ارسال متن آزاد.
- در ارسال الگویی ملی پیامک، مقادیر متغیرها به‌صورت یک رشته‌ی **جداشده با `;`** و به **ترتیب** تعریف الگو فرستاده می‌شوند — نه با نام.
- 🔴 به همین دلیل، هر مقداری که در متن جایگذاری می‌شود باید از کاراکتر `;` پاک‌سازی شود، وگرنه ترتیب متغیرها به هم می‌ریزد. تابع `sanitizeSmsArg()` بنویس.
- مقادیر عددی (مبلغ، شماره سفارش) با **ارقام لاتین** فرستاده شوند مگر الگو طور دیگری تأیید شده باشد.
- شناسه‌ی هر الگو در `.env` و قابل بازنویسی در تنظیمات ادمین باشد.

🔴 **قواعدی که نقضشان باگ جدی می‌سازد:**

1. **ارسال پیامک هرگز داخل تراکنش دیتابیس نباشد.** ترتیب درست:
   `تراکنش commit شود → سپس پیامک ارسال شود`
2. **شکست پیامک هرگز عملیات اصلی را rollback نکند.** ارسال در `try/catch` و خطا فقط در `NotificationLog` ثبت شود. اگر ملی پیامک قطع باشد، سفارش باید ثبت شود.
3. هر رویداد ابتدا یک ردیف `NotificationLog` با `unique(orderId, type)` می‌سازد. اگر ردیف از قبل هست، ارسال دوباره انجام نمی‌شود.
4. ارسال‌های ناموفق با `npm run job:retry-notifications` (حداکثر ۳ تلاش) دوباره تلاش می‌شوند.
5. در محیط توسعه با `SMS_PROVIDER=console` فقط در ترمینال چاپ می‌شود.
6. پاسخ ملی پیامک بررسی شود: کد موفقیت در `NotificationLog.providerMessageId` و کد خطا در `errorMessage` ذخیره شود. صرفاً «خطا نداد» به معنی «ارسال شد» نیست.

**متن‌ها** (قابل ویرایش در تنظیمات ادمین):
| رویداد | متغیرها به ترتیب | نمونه متن |
|---|---|---|
| `ORDER_PLACED` | orderNumber, amount | علی‌حان — سفارش {۱} به مبلغ {۲} تومان ثبت شد. لطفاً مبلغ را واریز و رسید را در سایت بارگذاری کنید. |
| `PAYMENT_APPROVED` | orderNumber | علی‌حان — پرداخت سفارش {۱} تأیید شد و سفارش شما در حال آماده‌سازی است. |
| `PAYMENT_REJECTED` | orderNumber | علی‌حان — رسید سفارش {۱} تأیید نشد. لطفاً به سایت مراجعه و رسید صحیح را بارگذاری کنید. |
| `ORDER_SHIPPED` | orderNumber, trackingCode | علی‌حان — سفارش {۱} ارسال شد. کد رهگیری: {۲} |

> ⚠️ **نکته‌ی عملیاتی برای کارفرما:** این‌ها پیامک **خدماتی** هستند و الگوهایشان باید از قبل در پنل ملی پیامک ثبت و تأیید شده باشند. فرایند تأیید چند روز طول می‌کشد — بهتر است قبل از رسیدن به فاز ۱۰ انجام شود.

### ۷.۷ انتقال وضعیت سفارش
فقط این انتقال‌ها مجاز است، در تابع مرکزی `transitionOrderStatus()`:
```
PENDING_PAYMENT  → PAYMENT_REVIEW | CANCELED
PAYMENT_REVIEW   → PROCESSING | PAYMENT_REJECTED
PAYMENT_REJECTED → PAYMENT_REVIEW | CANCELED
PROCESSING       → SHIPPED | CANCELED
SHIPPED          → DELIVERED
```
هر انتقال یک ردیف در `OrderStatusHistory` ثبت می‌کند و در صورت نیاز رویداد اعلان را trigger می‌کند.

---

## 8. امنیت

- OTP: ۶ رقمی، اعتبار ۲ دقیقه، حداکثر ۵ تلاش، حداکثر ۳ ارسال در ۱۰ دقیقه برای هر شماره و هر IP.
- Rate limit روی جدول Postgres (**بدون Redis** تا زیرساخت ساده بماند).
- **Rate limit روی اعتبارسنجی کد تخفیف** (حداکثر ۲۰ تلاش در ساعت برای هر کاربر/IP) تا کسی کدها را حدس نزند.
- Session: JWT در کوکی `httpOnly`, `secure`, `sameSite=lax` + رکورد `Session` برای ابطال.
- `middleware.ts` مسیرهای `/admin/*` و `/account/*` را محافظت می‌کند، **ولی** هر Server Action هم مستقلاً نقش را چک می‌کند.
- آپلود رسید: فقط `jpg/png/webp`، حداکثر ۵MB، نوع فایل با **magic bytes** بررسی شود نه پسوند، نام فایل uuid.
- تصاویر رسید **عمومی نباشند** — از طریق route handler با چک دسترسی (فقط صاحب سفارش یا ادمین).
- `description` محصول با `sanitize-html` پاک‌سازی شود.
- هیچ secret در کد — همه در `.env`، با `.env.example` کامل.
- هدرهای امنیتی در `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, CSP پایه.

---

## 9. متغیرهای محیطی

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=                        # حداقل ۳۲ کاراکتر تصادفی
NEXT_PUBLIC_SITE_URL=https://alihan.example

SMS_PROVIDER=melipayamak            # melipayamak | console
MELIPAYAMAK_USERNAME=
MELIPAYAMAK_PASSWORD=
MELIPAYAMAK_SENDER_NUMBER=          # در صورت نیاز به ارسال غیرالگویی
SMS_PATTERN_OTP=
SMS_PATTERN_ORDER_PLACED=
SMS_PATTERN_PAYMENT_APPROVED=
SMS_PATTERN_PAYMENT_REJECTED=
SMS_PATTERN_ORDER_SHIPPED=

STORAGE_DRIVER=local                # local | s3
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

ADMIN_SEED_PHONE=09xxxxxxxxx
```

> `SMS_PROVIDER=console` کد و متن را فقط در ترمینال چاپ می‌کند تا بدون هزینه بتوان تست کرد. **در production باید خطا بدهد.**

---

# 📋 فازبندی اجرا

---

## فاز ۰ — پایه‌گذاری پروژه

**کارها**
- ساخت پروژه Next.js 15 با TypeScript، App Router، Tailwind v4
- `tsconfig.json` با `strict: true`, `noUncheckedIndexedAccess: true`, alias `@/*`
- ESLint + Prettier + `simple-import-sort`
- فونت Vazirmatn در `public/fonts` و پیکربندی `next/font/local`
- `layout.tsx` با `lang="fa" dir="rtl"`
- `docker-compose.yml` برای Postgres توسعه
- `.env.example` کامل
- `lib/money.ts`, `lib/date.ts`, `lib/phone.ts`, `lib/unit.ts`, `lib/utils.ts` — فقط توابع خالص + تست واحد
- اسکریپت‌های `package.json`: `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `db:migrate`, `db:seed`, `db:studio`
- `README.md` با دستور راه‌اندازی محلی

**معیار تکمیل ✅**
- `npm run build` موفق
- `docker compose up -d` پستگرس را بالا می‌آورد
- صفحه اصلی متن فارسی راست‌چین با فونت وزیرمتن نشان می‌دهد
- تست‌های `lib/unit.ts` عنوان‌های جدول بخش ۶.۱ و محاسبه‌ی قیمت هر کیلو را درست تولید می‌کنند
- هیچ درخواستی به دامنه‌ی خارجی در Network tab دیده نمی‌شود

**انجام نده ❌** هیچ صفحه، مدل داده یا کامپوننت کسب‌وکاری.

---

## فاز ۱ — لایه‌ی داده

**کارها**
- نوشتن کل `schema.prisma` طبق بخش ۶ (تمام مدل‌ها یکجا)
- migration اولیه
- `lib/db.ts` (Prisma singleton سازگار با hot-reload)
- `prisma/seed.ts`:
  - یک کاربر ادمین با `ADMIN_SEED_PHONE`
  - ۳ دسته‌بندی و ۸ محصول واقعی باقلوا — **حتماً شامل هر دو حالت `GRAM` و `PIECE`**
  - هر محصول ۲ تا ۴ variant با `unitValue` متفاوت
  - دو کد تخفیف نمونه: یکی درصدی با سقف، یکی ارسال رایگان
  - یک `CompanyBankCard` نمونه
  - دو `ShippingMethod` (پست پیشتاز / پیک تهران)
  - تنظیمات پایه شامل متن پیامک‌ها و `maxQuantityPerItem = 99`
- لایه `repositories/` با توابع پایه‌ی خواندن

**معیار تکمیل ✅**
- `npm run db:migrate && npm run db:seed` تمیز اجرا می‌شود
- در Prisma Studio همه‌ی جداول با داده دیده می‌شوند
- 🔴 `grep -ri "stock\|inventory\|quantityAvailable" prisma/schema.prisma` هیچ نتیجه‌ای ندارد
- ایندکس trigram روی `Product.name` ساخته شده

**انجام نده ❌** هیچ UI.

---

## فاز ۲ — احراز هویت با OTP

**کارها**
- `lib/sms/` با اینترفیس `SmsProvider` و پیاده‌سازی‌های `ConsoleSmsProvider` و `MelipayamakProvider`
- تابع `sanitizeSmsArg()` طبق بند ۷.۶
- سرویس OTP: تولید، hash، ذخیره، ارسال، تأیید، rate limit روی Postgres
- ساخت خودکار کاربر در اولین ورود موفق
- مدیریت Session (ساخت/خواندن/ابطال) + کوکی امن
- `getCurrentUser()`, `requireUser()`, `requireAdmin()` در `server/auth/`
- `middleware.ts` برای محافظت `/admin/*` و `/account/*`
- صفحه `/login` دو مرحله‌ای (شماره → کد) با تایمر ارسال مجدد
- خروج از حساب

**معیار تکمیل ✅**
- ورود با شماره جدید ⇒ کاربر ساخته می‌شود
- کد اشتباه ۵ بار ⇒ قفل · ارسال بیش از ۳ بار در ۱۰ دقیقه ⇒ خطای محدودیت
- کاربر عادی روی `/admin` ⇒ ریدایرکت
- کد OTP خام هیچ‌جا در دیتابیس یا لاگ نیست
- پاسخ خطای ملی پیامک به‌درستی تشخیص داده و لاگ می‌شود

**انجام نده ❌** اعلان‌های پیامکی سفارش (فاز ۱۰).

---

## فاز ۳ — پوسته‌ی ادمین + مدیریت محصولات

**کارها**
- Layout ادمین: سایدبار، هدر، breadcrumb
- کامپوننت‌های پایه در `components/ui`: Button, Input, Select, Textarea, Modal, Table, Pagination, Toast, ConfirmDialog, EmptyState
- CRUD دسته‌بندی
- CRUD محصول:
  - انتخاب `unit` (گرمی / عددی) هنگام ایجاد
  - مدیریت variantها: `unitValue` + قیمت + وزن ارسال؛ عنوان خودکار با امکان بازنویسی
  - **کلید `isActive` برجسته و در دسترس** روی محصول و روی هر variant — این تنها راه «برداشتن موقت از سایت» است
  - نمایش قیمت هر کیلو در فرم برای محصولات گرمی
- جدول محصولات با جستجو، فیلتر دسته و وضعیت، صفحه‌بندی سمت سرور
- تولید خودکار slug از نام فارسی
- حذف محصول = **soft delete / غیرفعال‌سازی** اگر در سفارشی استفاده شده
- 🔒 قفل: پس از ثبت اولین سفارش برای یک محصول، تغییر `unit` آن ممنوع است

**معیار تکمیل ✅**
- ادمین یک محصول گرمی با variantهای ۵۰۰/۱۰۰۰/۲۰۰۰ و یک محصول عددی با ۶/۱۲ می‌سازد
- عنوان متغیرها خودکار و درست تولید می‌شود
- دو variant با `unitValue` یکسان ⇒ خطا
- غیرفعال کردن یک variant آن را فوراً از فروشگاه حذف می‌کند
- حذف محصولِ دارای سفارش، سفارش قدیمی را نمی‌شکند
- 🔴 هیچ فیلد یا ورودی موجودی در فرم‌ها وجود ندارد

**انجام نده ❌** آپلود فایل (فاز ۴).

---

## فاز ۴ — آپلود و مدیریت تصویر

**کارها**
- `lib/storage/` با اینترفیس `StorageDriver` + `LocalStorageDriver` + `S3StorageDriver` (آروان)
- Route handler آپلود با: چک نقش، محدودیت حجم، بررسی magic bytes، نام uuid
- فشرده‌سازی و تولید thumbnail با `sharp`
- آپلودر چندتایی با ترتیب‌دهی drag & drop و انتخاب تصویر اصلی
- تنظیم `next.config.ts` برای دامنه‌ی تصاویر

**معیار تکمیل ✅**
- آپلود ۵ تصویر و تغییر ترتیب و انتخاب تصویر اصلی
- فایل با پسوند jpg ولی محتوای غیرتصویری ⇒ رد
- فایل بالای ۵MB ⇒ رد با پیام فارسی
- تعویض `STORAGE_DRIVER` بدون تغییر کد UI کار می‌کند

---

## فاز ۵ — فروشگاه (کاتالوگ عمومی)

**کارها**
- صفحه اصلی: بنر، دسته‌ها، محصولات منتخب
- `/products` با فیلتر دسته، مرتب‌سازی و صفحه‌بندی
- `/category/[slug]`
- `/products/[slug]`: گالری، **انتخاب متغیر با عنوان خودکار**، قیمت پویا، **نمایش قیمت هر کیلو برای محصولات گرمی**، انتخاب تعداد با سقف `maxQuantityPerItem`، توضیحات
- جستجو با trigram
- Header/Footer، منوی موبایل، آیکون سبد
- `generateMetadata` + JSON-LD محصول + `sitemap.ts` + `robots.ts`
- صفحات `not-found` و `error`
- کش: `revalidate` روی صفحات کاتالوگ + `revalidatePath` بعد از تغییر محصول در ادمین
- فقط محصولات و variantهای `isActive` نمایش داده شوند

**معیار تکمیل ✅**
- Lighthouse موبایل: Performance ≥ ۹۰، SEO ≥ ۹۵
- تغییر متغیر، قیمت و قیمت هر کیلو را بلافاصله به‌روز می‌کند
- 🔴 هیچ نشانگر «موجود / ناموجود» در UI وجود ندارد
- هیچ درخواست خارجی در تب Network

---

## فاز ۶ — سبد خرید

**کارها**
- سرویس سبد مبتنی بر کوکی `cart_token` برای مهمان
- افزودن/حذف/تغییر تعداد با سقف `maxQuantityPerItem` در هر خط
- Merge سبد مهمان با سبد کاربر هنگام ورود (جمع تعداد، با اعمال سقف)
- صفحه `/cart` با محاسبه‌ی جمع
- مینی‌کارت در هدر
- حذف خودکار آیتم‌های مربوط به محصول یا variant غیرفعال، با نمایش پیام فارسی

**معیار تکمیل ✅**
- افزودن به سبد بدون لاگین → لاگین → سبد حفظ و merge می‌شود
- تعداد بیش از سقف ⇒ پیام فارسی و اصلاح خودکار به سقف
- غیرفعال کردن یک variant توسط ادمین ⇒ آن آیتم از سبد کاربر حذف و اطلاع داده می‌شود
- محاسبات جمع سبد سمت سرور انجام می‌شود
- 🔴 هیچ کوئری یا شرط مربوط به موجودی در مسیر سبد وجود ندارد

---

## فاز ۷ — کد تخفیف

**کارها**
- CRUD کوپن در ادمین: کد، نوع، مقدار، سقف تخفیف، حداقل سبد، دامنه (همه/دسته/محصول)، سقف استفاده کل و per-user، فقط سفارش اول، بازه‌ی زمانی شمسی، فعال/غیرفعال
- تولیدکننده‌ی کد تصادفی + نرمال‌سازی طبق بخش ۵
- تابع مرکزی `validateCoupon()` و `calculateDiscount()` طبق بند ۷.۳
- اعمال کوپن در صفحه‌ی سبد: ورودی کد، نمایش مبلغ تخفیف، حذف کوپن
- ذخیره‌ی `couponCode` روی `Cart`
- Rate limit روی تلاش‌های اعتبارسنجی
- صفحه‌ی گزارش استفاده از هر کوپن در ادمین

**معیار تکمیل ✅**
- تست واحد برای هر سه نوع کوپن، شامل سقف تخفیف درصدی
- کوپن منقضی / زیر حداقل سبد / فراتر از سقف استفاده ⇒ پیام خطای فارسی دقیق و متفاوت
- `firstOrderOnly` برای کاربری که سفارش پرداخت‌شده دارد ⇒ رد
- کوپن با `scope=CATEGORY` فقط روی آیتم‌های همان دسته اعمال می‌شود
- تخفیف هرگز از جمع سبد بیشتر نمی‌شود

---

## فاز ۸ — تسویه حساب و ثبت سفارش

**کارها**
- CRUD آدرس کاربر + آدرس پیش‌فرض
- صفحه `/checkout`: انتخاب آدرس، روش ارسال، یادداشت، خلاصه‌ی سفارش با تخفیف
- سرویس `createOrder()` **کاملاً داخل یک تراکنش**:
  ```
  اعتبارسنجی سبد و حذف آیتم‌های غیرفعال
  → محاسبه‌ی مجدد قیمت از دیتابیس
  → اعتبارسنجی مجدد کوپن و محاسبه‌ی تخفیف
  → ساخت Order + OrderItemها (اسنپ‌شات کامل)
  → ساخت CouponRedemption + افزایش usedCount
  → ساخت رکورد Payment
  → خالی کردن سبد
  ```
- تولید `orderNumber` خوانا و یکتا
- تابع مرکزی `transitionOrderStatus()` طبق بند ۷.۷
- صفحه‌ی موفقیت سفارش با شماره پیگیری

**معیار تکمیل ✅**
- 🔴 استفاده‌ی هم‌زمان دو کاربر از کوپنی با `usageLimitTotal=1` ⇒ فقط یکی موفق (تست شود)
- شکست در میانه ⇒ هیچ سفارش و هیچ redemption باقی نمی‌ماند
- `grandTotal` دقیقاً برابر `subtotal + shippingTotal − discountTotal`
- سفارش با variant غیرفعال ⇒ آیتم حذف و به کاربر اطلاع داده می‌شود
- 🔴 `createOrder()` هیچ قفل ردیف و هیچ کسر موجودی ندارد

**انجام نده ❌** ارسال پیامک (فاز ۱۰) — فقط نقطه‌ی رویداد مشخص شود.

---

## فاز ۹ — پرداخت کارت به کارت + کیف پول

**هدف:** قلب مالی سیستم. با دقت بالا.

**کارها**
- صفحه پرداخت سفارش: نمایش `CompanyBankCard` فعال + مبلغ + دکمه کپی شماره کارت
- فرم آپلود رسید: تصویر + شماره پیگیری + ۴ رقم آخر کارت مبدأ + تاریخ واریز شمسی
- انتقال به `PAYMENT_REVIEW`
- سرو امن تصویر رسید (فقط صاحب سفارش یا ادمین)
- صف بررسی پرداخت‌ها در ادمین: مشاهده‌ی رسید در اندازه‌ی بزرگ، تأیید / رد با دلیل
- **idempotency** کامل روی تأیید و رد
- پرداخت از کیف پول به‌عنوان روش جایگزین (کسر موجودی + `WalletTransaction` + تأیید فوری)
- بازگشت وجه به کیف پول هنگام لغو سفارشِ پرداخت‌شده
- ثبت `AuditLog` برای هر عمل مالی

**معیار تکمیل ✅**
- چرخه‌ی کامل سفارش تا تأیید ادمین بدون خطا
- دوبار کلیک روی «تأیید» ⇒ فقط یک اثر مالی
- رد رسید ⇒ کاربر می‌تواند رسید جدید بفرستد؛ کوپن آزاد نمی‌شود
- مجموع `WalletTransaction` هر کاربر **دقیقاً** برابر `User.walletBalance` (اسکریپت بررسی نوشته شود)
- کاربر A نمی‌تواند رسید کاربر B را ببیند

---

## فاز ۱۰ — اعلان‌های پیامکی (ملی پیامک)

**کارها**
- سرویس `notificationService.send(type, order)` طبق بند ۷.۶
- ساخت `NotificationLog` با `unique(orderId, type)` قبل از ارسال
- اتصال به رویدادها: `ORDER_PLACED`، `PAYMENT_APPROVED`، `PAYMENT_REJECTED`، `ORDER_SHIPPED`
- 🔴 فراخوانی **بعد از commit تراکنش** و داخل `try/catch`
- فرم ثبت کد رهگیری هنگام تغییر وضعیت به `SHIPPED`
- متن‌ها و شناسه‌ی الگوها در تنظیمات ادمین، با پیش‌نمایش ترتیب متغیرها
- بررسی و ذخیره‌ی کد پاسخ ملی پیامک
- صفحه‌ی ادمین برای مشاهده‌ی لاگ پیامک‌ها و وضعیتشان
- `npm run job:retry-notifications` با حداکثر ۳ تلاش

**معیار تکمیل ✅**
- 🔴 **تست کلیدی:** با نام کاربری/رمز نامعتبر ملی پیامک، ثبت سفارش **موفق** است و فقط `NotificationLog` با وضعیت `FAILED` ثبت می‌شود
- دوبار تأیید یک پرداخت ⇒ فقط یک پیامک
- مقداری که شامل `;` باشد، ترتیب متغیرهای الگو را خراب نمی‌کند
- job، ارسال‌های ناموفق را دوباره تلاش می‌کند و بعد از ۳ بار متوقف می‌شود
- در حالت `console` متن کامل با مقادیر جایگزین‌شده چاپ می‌شود

---

## فاز ۱۱ — پنل کاربر + مدیریت کاربران در ادمین

**کارها**
- پنل کاربر: لیست و جزئیات سفارش‌ها، آدرس‌ها، پروفایل، تاریخچه‌ی کیف پول
- لغو سفارش توسط کاربر در وضعیت `PENDING_PAYMENT`
- ادمین: لیست کاربران با جستجو بر اساس شماره/نام، ویرایش، فعال/غیرفعال‌سازی
- ادمین: افزایش/کاهش دستی موجودی کیف پول با یادداشت اجباری + AuditLog
- ادمین: مشاهده‌ی تاریخچه‌ی تراکنش‌های هر کاربر

**معیار تکمیل ✅**
- تغییر موجودی کیف پول توسط ادمین همیشه یک ردیف ledger می‌سازد
- غیرفعال کردن کاربر، نشست‌هایش را باطل می‌کند
- لغو سفارش توسط کاربر، کوپن را آزاد می‌کند
- کاربر فقط سفارش‌های خودش را می‌بیند (تست دسترسی نوشته شود)

---

## فاز ۱۲ — گزارش‌گیری و داشبورد

**کارها**
- کارت‌های خلاصه: فروش امروز/هفته/ماه، تعداد سفارش، میانگین سبد، سفارش‌های در انتظار تأیید
- فیلتر بازه‌ی زمانی **شمسی** (امروز / ۷ روز / ۳۰ روز / بازه‌ی دلخواه)
- نمودار خطی فروش در بازه (Recharts)
- نمودار دایره‌ای سهم دسته‌بندی‌ها
- جدول پرفروش‌ترین محصولات و پرفروش‌ترین متغیرها
- گزارش تخفیف: مبلغ کل تخفیف داده‌شده به تفکیک کوپن
- جدول سفارش‌ها با فیلتر وضعیت/تاریخ و جستجو بر اساس شماره سفارش یا موبایل
- خروجی CSV از سفارش‌ها
- تمام تجمیع‌ها با **کوئری SQL/Prisma aggregate**، نه محاسبه در جاوااسکریپت

**معیار تکمیل ✅**
- ارقام گزارش با جمع دستی سفارش‌های seed تطابق دارد
- فقط سفارش‌های پرداخت‌شده در «فروش» حساب می‌شوند
- «فروش» برابر `grandTotal` است و تخفیف جداگانه گزارش می‌شود
- بازه‌های شمسی درست محاسبه می‌شوند (مرز ماه و سال تست شود)

---

## فاز ۱۳ — استحکام، تنظیمات و استقرار

**کارها**
- صفحه تنظیمات ادمین: کارت‌های بانکی، روش‌های ارسال، متن و الگوی پیامک‌ها، `maxQuantityPerItem`، اطلاعات تماس، متن‌های ثابت
- Job انقضای سفارش‌های بدون رسید (`npm run job:expire-orders`) + راهنمای cron
- `npm run job:retry-notifications` + cron
- اسکریپت بررسی سلامت مالی (تطابق ledger و balance، تطابق `usedCount` کوپن‌ها با redemptionها)
- `/api/health`
- لاگ‌گیری ساختاریافته برای خطاها
- Dockerfile چندمرحله‌ای + `docker-compose.prod.yml`
- اسکریپت بکاپ روزانه‌ی Postgres + راهنمای restore
- تست‌های Playwright برای ۴ مسیر بحرانی: ورود، ثبت سفارش با کد تخفیف، آپلود رسید، تأیید توسط ادمین
- بررسی نهایی امنیت و Lighthouse
- `DEPLOYMENT.md`

**معیار تکمیل ✅**
- استقرار روی سرور تمیز فقط با `docker compose up -d` و اجرای migration
- بکاپ گرفته و با موفقیت restore شده
- هر ۴ تست e2e سبز

---

## 10. آنچه در نسخه ۱ عمداً انجام نمی‌شود

| مورد | دلیل |
|---|---|
| **مدیریت موجودی و انبارداری** | **تصمیم کسب‌وکاری — همه‌ی محصولات همیشه موجودند** |
| درگاه پرداخت آنلاین | v2 — نیاز به نماد و مجوز |
| وبلاگ | v2 |
| وزن آزاد (ورود دلخواه وزن) | پیچیدگی بالا؛ پله‌های ثابت کافی است |
| چندزبانه | نیازی نیست |
| اپلیکیشن موبایل | نیازی نیست |
| Redis / صف پیام | زیرساخت ساده بماند |
| میکروسرویس | بدون توجیه |

---

## 11. تصمیمات تکمیلی

> Claude Code: هر تصمیمی که در طول کار پرسیدی و پاسخ گرفتی، اینجا با تاریخ ثبت کن.

| تاریخ | موضوع | تصمیم |
|---|---|---|
| — | مدیریت موجودی | **حذف کامل از نسخه ۱.** جایگزین: کلید `isActive` + سقف تعداد در هر خط سبد |
| — | متغیر محصول | `unit` (GRAM/PIECE) + `unitValue` فقط برای عنوان خودکار، قیمت هر کیلو و وزن ارسال |
| — | کد تخفیف | در نسخه ۱ — سه نوع: درصدی، مبلغ ثابت، ارسال رایگان |
| — | پیامک | ملی پیامک، ارسال الگویی، در نسخه ۱ برای ۴ رویداد سفارش |
| ۱۴۰۵/۰۶/۳۰ | ابزار تست واحد | **Vitest** (devDependency). alias `@/*` در `vitest.config.ts` تنظیم شده؛ تست‌ها کنار فایل با پسوند `.test.ts` |
| ۱۴۰۵/۰۶/۳۰ | پورت Postgres توسعه | روی میزبان `127.0.0.1:5435` (نه ۵۴۳۲) تا با Postgres سایر پروژه‌های روی همین ماشین تداخل نکند؛ `DATABASE_URL` در `.env.example` هم‌خوان است. نام پروژه‌ی compose: `alihan-shop` |
| ۱۴۰۵/۰۶/۳۰ | نسخه‌ی Prisma | **6.19** (نه 7): نسخه‌ی 7 به `@prisma/adapter-pg` و `pg` نیاز دارد که در سند نیستند. `postinstall` اجرای `prisma generate` است |
| ۱۴۰۵/۰۶/۳۰ | Rate limit | مدل جدید **`RateLimitEvent`** (`key`, `createdAt`, ایندکس `(key, createdAt)`) در فاز ۱ اضافه شد؛ هر تلاش یک ردیف، شمارش در بازه‌ی زمانی |
| ۱۴۰۵/۰۶/۳۰ | دلیل کیف پول | `WalletTransaction.reason` یک enum به نام **`WalletTxReason`** است: `ADMIN_CREDIT`, `ADMIN_DEBIT`, `ORDER_PAYMENT`, `ORDER_REFUND` (`ADMIN_DEBIT` برای کاهش دستی فاز ۱۱ اضافه شد) |
| ۱۴۰۵/۰۶/۳۰ | نوع شناسه‌ها و تاریخ‌ها | شناسه‌ها `String @default(cuid())`؛ همه‌ی `DateTime`ها `@db.Timestamptz(3)`؛ ایندکس trigram با `previewFeatures = ["postgresqlExtensions"]` و `extensions = [pg_trgm]` |
| ۱۴۰۵/۰۶/۳۰ | قالب متن پیامک | جایگذاری متغیرها در متن‌های ذخیره‌شده با `{1}`, `{2}` (ارقام لاتین) به ترتیب متغیرهای الگو؛ کلید تنظیمات: `sms.templates` |
| ۱۴۰۵/۰۶/۳۰ | slug در seed | slugها فارسی و با خط تیره (مثل `باقلوا-یزدی`) تا با تولید خودکار slug در فاز ۳ هم‌خوان باشد |
| ۱۴۰۵/۰۶/۳۰ | کتابخانه‌ی JWT | **`jose`** (تأیید شد) برای امضا/بررسی JWT با HS256. `zod` هم که در استک سند بود نصب شد |
| ۱۴۰۵/۰۶/۳۰ | مدت Session و تایمر ارسال مجدد | Session ‏**۳۰ روز**؛ تایمر «ارسال مجدد» در UI ‏**۱۲۰ ثانیه** (سقف سروری ۳ ارسال در ۱۰ دقیقه برای هر شماره و هر IP برقرار است) |
| ۱۴۰۵/۰۶/۳۰ | متد ارسال ملی پیامک | **`SendByBaseNumber2`**: `POST https://api.payamak-panel.com/post/send.asmx/SendByBaseNumber2`، `application/x-www-form-urlencoded` با `username, password, text, to, bodyId`؛ `text` = مقادیر جداشده با `;` به ترتیب الگو. پاسخ XML: `<string xmlns="http://tempuri.org/">مقدار</string>`؛ موفقیت فقط وقتی مقدار عددی بلند (recId) باشد، هر مقدار کوتاه (مثل `0`، `-4`، `2`) کد خطاست. کد `0` (اعتبار نامعتبر) با فراخوانی واقعی و اعتبار ساختگی تأیید شد |
| ۱۴۰۵/۰۶/۳۰ | ساختار Session | JWT با `jti` = شناسه‌ی رکورد `Session`، `sub` = userId، claim ‏`role`. `Session.tokenHash` = SHA-256 خود JWT. نقش و `isActive` در `getCurrentUser()` از دیتابیس خوانده می‌شود، نه از JWT. کوکی: `alihan_session` (`httpOnly`, `sameSite=lax`, `secure` فقط در production) |
| ۱۴۰۵/۰۶/۳۰ | hash کد OTP | HMAC-SHA256 با کلید `AUTH_SECRET` روی `phone:code` (فضای ۶ رقمی با SHA-256 ساده با نشت دیتابیس شکسته می‌شود) |
| ۱۴۰۵/۰۶/۳۰ | runtime میدل‌ور | `runtime: "nodejs"` (پایدار در Next 15.5) تا طبق سند به Edge Runtime وابسته نباشیم و هشدار `CompressionStream` کتابخانه‌ی jose هم نیاید. middleware فقط امضا/انقضای JWT را می‌سنجد (بدون دیتابیس) |
| ۱۴۰۵/۰۶/۳۰ | شمارش ارسال OTP | ارسال‌های ناموفق پیامک هم در سقف ۳ تا در ۱۰ دقیقه شمرده می‌شوند؛ اگر IP کلاینت مشخص نباشد فقط سقف شماره اعمال می‌شود |
| ۱۴۰۵/۰۶/۳۰ | وزن ارسال پیش‌فرض متغیر گرمی | هر متغیر یک «جعبه» است (۵۰۰ گرمی، ۱ کیلوگرمی، یا مثلاً «۴ عددی») و مشتری تعداد جعبه را در سبد تعیین می‌کند؛ وزن ارسال هر متغیر در فرم محصول قابل تنظیم است و در سبد در تعداد ضرب می‌شود. عدد وزن بسته‌بندی هنوز مشخص نشده: پیشنهاد فرم = `unitValue + DEFAULT_PACKAGING_GRAMS` که فعلاً `0` است (ثابت در `lib/unit.ts`). برای PIECE پیشنهادی نیست و ادمین وارد می‌کند |
| ۱۴۰۵/۰۶/۳۰ | قاعده‌ی slug | فارسی با خط تیره: ی/ک عربی → فارسی، ارقام → لاتین، نیم‌فاصله و فاصله و نشانه → `-`؛ تکراری → پسوند `-2`، `-3`؛ ادمین می‌تواند دستی ویرایش کند. با تغییر نام محصول/دسته، slug موجود عوض نمی‌شود (URL پایدار می‌ماند) |
| ۱۴۰۵/۰۶/۳۰ | فرمت توضیحات محصول | **متن ساده با بریدگی خط**؛ هنگام ذخیره با `sanitize-html` همه‌ی تگ‌ها حذف می‌شود (کتابخانه‌ی سند، نصب شد). خروجی باید فقط به‌صورت متن رندر شود (هرگز `dangerouslySetInnerHTML`) |
| ۱۴۰۵/۰۶/۳۰ | قواعد ویرایش متغیر و حذف | `isActive` محصول و متغیر موجود فقط با کلید فوری عوض می‌شود (ذخیره‌ی فرم دستش نمی‌زند). متغیر حذف‌شده از فرم در ذخیره پاک می‌شود، مگر در سفارشی استفاده شده باشد (آن‌گاه خطا و پیشنهاد غیرفعال‌سازی). حذف محصول: اگر سفارش دارد فقط غیرفعال می‌شود. دسته‌ی دارای محصول یا زیردسته حذف نمی‌شود |
| ۱۴۰۵/۰۶/۳۰ | `/admin` | تا داشبورد فاز ۱۲، به `/admin/products` ریدایرکت می‌شود. هر صفحه‌ی ادمین علاوه بر layout، خودش `requireAdmin()` را صدا می‌زند (layoutها در ناوبری کلاینتی دوباره اجرا نمی‌شوند) |
| ۱۴۰۵/۰۶/۳۰ | کتابخانه‌های فاز ۴ | **`sharp`** (در سند) و **`aws4fetch`** (تأیید شد؛ امضای SigV4 روی `fetch` برای S3StorageDriver). بدون `@aws-sdk` |
| ۱۴۰۵/۰۶/۳۰ | متغیرهای محیطی جدید | `S3_PUBLIC_URL` (اختیاری؛ پایه‌ی آدرس عمومی، پیش‌فرض `S3_ENDPOINT/S3_BUCKET` path-style) و `S3_REGION` (اختیاری؛ پیش‌فرض `us-east-1` برای امضا). دسترسی خواندن عمومی باید روی خود bucket فعال باشد؛ درایور ACL نمی‌فرستد |
| ۱۴۰۵/۰۶/۳۰ | پردازش تصویر | همه‌ی ورودی‌ها (jpg/png/webp، تشخیص با magic bytes) به **WebP**: ضلع بلند ≤ ۱۶۰۰px با کیفیت ۸۲ + thumbnail ۴۰۰px (کیفیت ۷۸)؛ جهت EXIF اعمال و همه‌ی متادیتا حذف؛ سقف ورودی ۴۰ میلیون پیکسل (ضد «بمب تصویری»)؛ حداکثر ۵MB و **۱۰ تصویر** برای هر محصول |
| ۱۴۰۵/۰۶/۳۰ | ذخیره‌ی آدرس تصویر | `ProductImage.url` آدرس عمومی کامل است (`/api/media/products/<uuid>.webp` یا آدرس S3)، نه کلید؛ thumbnail با قرارداد `<uuid>-thumb.webp` (تابع `thumbnailUrl`). با تعویض driver فقط آپلودهای جدید به مقصد جدید می‌روند و آدرس‌های قدیمی همچنان کار می‌کنند |
| ۱۴۰۵/۰۶/۳۰ | سرو فایل محلی | Next در production فایل‌های بعد از استارتِ `public/` را سرو نمی‌کند (تست شد: ۴۰۴)، پس driver محلی از `/api/media/*` سرو می‌شود؛ این route فقط الگوی `products/<uuid>[-thumb].webp` را می‌پذیرد و هر مسیر دیگر (مثل رسیدها در فاز ۹) ۴۰۴ است |
| ۱۴۰۵/۰۶/۳۰ | مدیریت تصاویر در UI | تصاویر فقط در صفحه‌ی **ویرایش** محصول مدیریت می‌شوند (آپلود/ترتیب/اصلی/حذف با اعمال فوری، مثل کلیدهای فعال)؛ بعد از ساخت محصول، ادمین به صفحه‌ی ویرایش می‌رود. ترتیب: drag & drop native (بدون کتابخانه) + دکمه‌های ←/→. آپلودهای هم‌زمان یک محصول با `pg_advisory_xact_lock` (نه قفل ردیف) ترتیب‌بندی می‌شوند. حذف کامل محصول، فایل‌های تصاویرش را هم پاک می‌کند |
| ۱۴۰۵/۰۷/۰۱ | طراحی UI | مرجع ظاهر فروشگاه: پوشه‌ی `design_handoff_alihan_store/` (تم تیره‌ی سبز، توکن‌ها در `globals.css` با `@theme`). جایی که با این سند تضاد دارد، **این سند** مقدم است (موارد زیر) |
| ۱۴۰۵/۰۷/۰۱ | موجودی در طراحی | کلید «فقط کالاهای موجود» و برچسب «موجود در انبار» طراحی **ساخته نشد** (بخش ۷.۱). داده‌ی ساختاریافته‌ی محصول هم `availability` ندارد |
| ۱۴۰۵/۰۷/۰۱ | صفحات منو | صفحه اصلی، فروشگاه، **آدرس شعب** (`/branches`)، **درباره ما** (`/about`)، **تماس با ما** (`/contact`) — محتوای ثابت از `lib/site-content.ts`. **وبلاگ** طبق سند نسخه ۲ است و از منو حذف شد. شماره تلفن، آدرس‌ها، شعب و آمار «درباره ما» نمونه‌اند و باید با کارفرما تأیید شوند |
| ۱۴۰۵/۰۷/۰۱ | قابلیت‌های بدون مدل داده | **علاقه‌مندی، امتیاز/نظرات، خبرنامه** طراحی ساخته نشدند. تب «علاقه‌مندی» موبایل با «سبد خرید» جایگزین شد. دکمه‌ی «ویدیو معرفی برند» هم تا وجود ویدیو ساخته نشد. آکاردئون «مواد اولیه» ساخته نشد (فیلدی در اسکیما ندارد) |
| ۱۴۰۵/۰۷/۰۱ | آدرس‌ها | طبق سند: `/products`، `/products/[slug]`، `/category/[slug]` (نه `/shop` و `/product/[slug]` طراحی) |
| ۱۴۰۵/۰۷/۰۱ | افزودن به سبد در فاز ۵ | دکمه‌ی + کارت محصول در فاز ۵ به صفحه‌ی محصول می‌رود؛ صفحه‌ی محصول متغیر/تعداد/جمع دارد ولی دکمه‌ی «افزودن به سبد» و نوار چسبان پایین موبایل ندارد. `/cart` فعلاً فقط حالت خالی است. **فاز ۶** همه را به سبد وصل می‌کند. آیکون حساب کاربری تا فاز ۱۱ به `/login` می‌رود |
| ۱۴۰۵/۰۷/۰۱ | برچسب و محصولات پرطرفدار | بدون migration: «محصولات پرطرفدار» = ۴ محصول اول بر اساس `sortOrder`؛ برچسب «جدید» خودکار برای محصول کمتر از ۳۰ روز؛ برچسب «پرفروش» فعلاً نیست. گزینه‌ی مرتب‌سازی پیش‌فرض «منتخب فروشگاه» است (نه «پرفروش‌ترین» که داده‌ای پشتش نیست) |
| ۱۴۰۵/۰۷/۰۱ | جداکننده‌ی هزارگان | طبق سند طراحی **کاما** با ارقام فارسی (`۲,۴۰۰,۰۰۰`) به‌جای «٬» فاز ۰ |
| ۱۴۰۵/۰۷/۰۱ | فیلترهای فروشگاه | دسته (چندتایی، با تعداد)، بسته، بازه‌ی قیمت (اسلایدر دوگانه، اعمال پس از رها کردن)، مرتب‌سازی (منتخب/جدیدترین/ارزان‌ترین/گران‌ترین)، صفحه‌بندی ۹تایی، همه در query string. فیلتر بسته با کلید **واحد+مقدار** (`?weight=g500,p12`) چون «۱۲ عددی» ≠ «۱۲ گرم». شرط بسته و قیمت باید روی **یک متغیر واحد** صدق کند |
| ۱۴۰۵/۰۷/۰۱ | جستجو | `pg_trgm` روی نام: ی/ک عربی یکسان، نیم‌فاصله → فاصله؛ تطبیق زیررشته‌ای بدون فاصله + `word_similarity ≥ 0.5` برای غلط تایپی؛ مرتب بر اساس شباهت. با کاتالوگ کوچک، مرتب‌سازی قیمتی و شباهتی در حافظه انجام می‌شود |
| ۱۴۰۵/۰۷/۰۱ | کش کاتالوگ | صفحه‌ی اصلی و صفحه‌ی محصول ISR با `revalidate = 300` (صفحه‌ی محصول در اولین درخواست ساخته می‌شود)؛ `sitemap` یک ساعت؛ فهرست و دسته به‌خاطر query پویا هستند. هر تغییر ادمین با `revalidatePath("/", "layout")` فوراً همه را تازه می‌کند (تست شد). ⚠️ صفحه‌ی اصلی و sitemap هنگام **build** به دیتابیس نیاز دارند (برای Docker در فاز ۱۳) |
| ۱۴۰۵/۰۷/۰۱ | آیکون‌ها | inline SVG در `components/shop/icons.tsx` (بدون `lucide-react` پیشنهادی طراحی، تا کتابخانه‌ی تازه اضافه نشود) |
| ۱۴۰۵/۰۷/۰۱ | سقف تعداد | شمارنده‌ی صفحه‌ی محصول از `maxQuantityPerItem` تنظیمات (۹۹) پیروی می‌کند، نه عدد ۲۰ طراحی |
| ۱۴۰۵/۰۷/۰۱ | محصول بدون متغیر فعال | در فروشگاه نمایش داده نمی‌شود (قیمتی برای نمایش ندارد) |
| ۱۴۰۵/۰۷/۰۱ | شناسایی سبد | مهمان: کوکی `cart_token` (توکن تصادفی ۲۴ بایتی، `httpOnly`، `sameSite=lax`، ۳۰ روز). کاربر واردشده: `Cart.userId` (کوکی لازم ندارد). سبد متعلق به یک کاربر هرگز از روی کوکی قابل دسترسی نیست. قیمت در سبد ذخیره نمی‌شود و هر بار از دیتابیس خوانده می‌شود |
| ۱۴۰۵/۰۷/۰۱ | ادغام سبد | در `verifyOtpAction` بلافاصله پس از ورود: تعدادها جمع و سقف اعمال می‌شود، سبد مهمان حذف و کوکی‌اش پاک می‌شود. اگر کاربر سبدی نداشت، سبد مهمان به او منتقل می‌شود. برای اطمینان، ادغام «تنبل» هم هنگام خواندن سبد انجام می‌شود |
| ۱۴۰۵/۰۷/۰۱ | سبد و کش صفحات | شمارنده‌ی هدر و مینی‌کارت در کلاینت (`CartProvider`) با Server Action `getCartAction` پر می‌شوند تا صفحات فروشگاه به کوکی وابسته نشوند و کش ISR بماند (تست شد: `HIT`). فقط `/cart` پویاست |
| ۱۴۰۵/۰۷/۰۱ | اقلام غیرفعال و سقف | هنگام خواندن سبد، خطی که محصول یا متغیرش غیرفعال شده حذف و با پیام فارسی اطلاع داده می‌شود؛ تعداد بیش از سقف فعلی (`maxQuantityPerItem`) هم اصلاح و اطلاع داده می‌شود |
| ۱۴۰۵/۰۷/۰۱ | دکمه‌ی + کارت محصول | «انتخاب سریع متغیر»: تک‌متغیره مستقیم اضافه می‌شود؛ چندمتغیره پنل کوچک انتخاب بسته روی کارت باز می‌کند. پس از افزودن: پیام «به سبد خرید اضافه شد» + باز شدن مینی‌کارت |
| ۱۴۰۵/۰۷/۰۱ | صفحه‌ی `/cart` در فاز ۶ | نشانگر سه‌مرحله‌ای، خطوط سبد، خلاصه (جمع کالاها؛ هزینه‌ی ارسال «در مرحله‌ی ارسال»). کارت کد تخفیف در **فاز ۷** و دکمه‌ی «ادامه و ثبت سفارش» در **فاز ۸** اضافه می‌شوند. هدیه‌پیچی «رایگان» طراحی ساخته نشد (در دامنه‌ی نسخه ۱ نیست) |
| ۱۴۰۵/۰۷/۰۱ | گرد کردن تخفیف درصدی | مبلغ تخفیف درصدی **رو به پایین تا ۱۰۰۰ تومان** گرد می‌شود و سپس `maxDiscountAmount` اعمال می‌شود. تخفیف ثابت = `min(value, جمع مشمول)`؛ کل تخفیف هرگز از جمع کالا + ارسال بیشتر نمی‌شود |
| ۱۴۰۵/۰۷/۰۱ | کد تخفیف فقط برای کاربر واردشده | مهمان در `/cart` به‌جای ورودی کد، پیوند «وارد حساب خود شوید» (`/login?next=/cart`) می‌بیند؛ سرور هم کد مهمان را رد می‌کند |
| ۱۴۰۵/۰۷/۰۱ | دامنه‌ی دسته‌ای کد | دسته‌ی انتخاب‌شده **همه‌ی زیردسته‌هایش** را هم شامل می‌شود؛ تخفیف فقط روی جمع خطوط مشمول محاسبه می‌شود |
| ۱۴۰۵/۰۷/۰۱ | محدودیت تلاش کد | ۲۰ تلاش در ساعت به ازای هر کاربر و هر IP (جدول `RateLimitEvent`)؛ **هر تلاش** (موفق یا ناموفق) شمرده می‌شود |
| ۱۴۰۵/۰۷/۰۱ | کد روی سبد | فقط کد معتبر روی `Cart.couponCode` ذخیره می‌شود. اگر بعداً نامعتبر شود (مثلاً سبد زیر حداقل مبلغ برود یا کد منقضی شود) روی سبد می‌ماند، تخفیفش ۰ است و پیام خطای همان شرط نمایش داده می‌شود؛ با اصلاح سبد دوباره اعمال می‌شود. در سبد هزینه‌ی ارسال هنوز معلوم نیست، پس تخفیف «ارسال رایگان» آنجا ۰ و ارسال «رایگان» نمایش داده می‌شود (مبلغ واقعی در فاز ۸) |
| ۱۴۰۵/۰۷/۰۱ | «سفارش پرداخت‌شده» برای «فقط اولین خرید» | سفارشی که `paidAt` دارد |
| ۱۴۰۵/۰۷/۰۱ | مدیریت کد در ادمین | کد استفاده‌شده (`usedCount > 0` یا redemption) حذف نمی‌شود، فقط غیرفعال. «تا تاریخ» شامل **کل همان روز به وقت تهران** است. تاریخ‌ها با ورودی متنی شمسی (`۱۴۰۵/۰۷/۰۱`، ارقام فارسی یا لاتین) بدون کتابخانه‌ی تقویم. تولید خودکار کد ۸ کاراکتری از حروف/ارقام بدون نویسه‌های مشابه (O/0، I/1، L). کد همیشه به حروف بزرگ لاتین نرمال می‌شود (ارقام فارسی → لاتین، فاصله حذف) |
| ۱۴۰۵/۰۷/۰۱ | برچسب جمع نهایی سبد | «جمع پس از تخفیف» طبق طراحی؛ در مینی‌کارت فقط وقتی تخفیف هست (وگرنه «جمع کالاها») |
| ۱۴۰۵/۰۷/۰۱ | آستانه‌ی ارسال رایگان | `freeAboveAmount` روش ارسال با مبلغ کالا **پس از تخفیف** مقایسه می‌شود. کد ارسال رایگان: تخفیف = هزینه‌ی ارسال (اگر ارسال خودش رایگان باشد، تخفیف ۰) |
| ۱۴۰۵/۰۷/۰۱ | منطقه‌ی ارسال | فعلاً **فقط استان تهران / شهر تهران** (شرایط نگهداری و ارسال باقلوا). فهرست در `lib/service-area.ts`؛ استان و شهر در فرم آدرس انتخابی‌اند و سرور هم هنگام ذخیره‌ی آدرس و ثبت سفارش چک می‌کند |
| ۱۴۰۵/۰۷/۰۱ | محدوده‌ی روش ارسال | migration: فیلد `ShippingMethod.provinces` (خالی = همه‌ی مناطق تحت پوشش). «پیک تهران» در seed به «تهران» محدود شد و توضیح «پست پیشتاز» از «سراسر کشور» اصلاح شد |
| ۱۴۰۵/۰۷/۰۱ | آدرس در فاز ۸ | افزودن/ویرایش/حذف/پیش‌فرض درون صفحه‌ی تسویه (صفحه‌ی آدرس‌های پنل کاربر در فاز ۱۱). اولین آدرس خودکار پیش‌فرض؛ با حذف آدرس پیش‌فرض، جدیدترین آدرس پیش‌فرض می‌شود؛ حداکثر ۲۰ آدرس؛ موبایل گیرنده فقط شماره‌ی موبایل؛ کد پستی اختیاری و ۱۰ رقمی |
| ۱۴۰۵/۰۷/۰۱ | شماره‌ی سفارش | `AL-{تاریخ شمسی تهران}-{ردیف روز، حداقل ۴ رقم}`. برای جلوگیری از شماره‌ی تکراری در سفارش‌های هم‌زمان، فقط مرحله‌ی شماره‌گذاری با قفل مشورتی سطح تراکنش (`pg_advisory_xact_lock`) پشت‌سرهم می‌شود — **نه** قفل ردیف محصول/متغیر |
| ۱۴۰۵/۰۷/۰۱ | قواعد ثبت سفارش | قلم غیرفعال یا اصلاح سقف ⇒ سفارش ثبت نمی‌شود و پیام نمایش داده می‌شود. مشتری مبلغی را که دیده می‌فرستد؛ اگر محاسبه‌ی سرور متفاوت بود، ثبت نمی‌شود («مبلغ سفارش تغییر کرده است»). کد نامعتبر هنگام ثبت ⇒ سفارش ثبت نمی‌شود. کدی که برای سفارش تخفیف ۰ دارد ثبت و مصرف نمی‌شود. مصرف کوپن با `UPDATE` شرطی اتمی (`usedCount < usageLimitTotal`) و سپس بازشماری سهم کاربر. اگر اقلام سبد هم‌زمان مصرف شده باشند (دوبار کلیک)، کل تراکنش برمی‌گردد |
| ۱۴۰۵/۰۷/۰۱ | پرداخت در فاز ۸ | هر سفارش یک `Payment(CARD_TO_CARD, PENDING)` به مبلغ `grandTotal` می‌گیرد؛ پرداخت از کیف پول و صفحه‌ی پرداخت در فاز ۹ |
| ۱۴۰۵/۰۷/۰۱ | `transitionOrderStatus()` | انتقال فقط اگر وضعیت هنوز همان وضعیت خوانده‌شده باشد (بدون قفل صریح)؛ `SHIPPED` ⇒ `shippedAt`، `CANCELED` ⇒ `canceledAt` + آزادسازی کوپن. `paidAt` در تأیید پرداخت (فاز ۹). رویداد اعلان پس از commit به `publishOrderEvent()` می‌رود که فعلاً لاگ ساختاریافته است و در فاز ۱۰ به پیامک وصل می‌شود |
| ۱۴۰۵/۰۷/۰۱ | تست یکپارچه | `npm run test:integration` روی Postgres توسعه (`*.int.test.ts`؛ هر تست داده‌ی خودش را می‌سازد و پاک می‌کند). `npm test` فقط تست‌های واحد است |
| ۱۴۰۵/۰۷/۰۱ | مسیرهای تسویه | `/checkout` (محافظت‌شده در middleware؛ مهمان ⇒ ورود و سپس بازگشت با سبد ادغام‌شده) و `/checkout/success/[orderNumber]` (فقط صاحب سفارش؛ وگرنه ۴۰۴). برچسب جمع نهایی در تسویه «مبلغ قابل پرداخت» طبق طراحی |
| ۱۴۰۵/۰۷/۰۱ | پرداخت از کیف پول و جدول ۷.۷ | جدول انتقال گسترش یافت: `PENDING_PAYMENT → PROCESSING` و `PAYMENT_REJECTED → PROCESSING` **فقط** برای پرداخت کیف پول (تأیید فوری). ورود به `PROCESSING` همیشه به `paidAt` نیاز دارد. پرداختِ در انتظارِ سفارش به `WALLET/APPROVED` تبدیل می‌شود. فقط پرداخت کامل (بدون ترکیب کیف پول و کارت). بخش کیف پول در صفحه‌ی پرداخت فقط وقتی موجودی > ۰ است نمایش داده می‌شود |
| ۱۴۰۵/۰۷/۰۱ | لغو و بازگشت وجه | دکمه‌ی «لغو سفارش (و بازگشت وجه)» در صفحه‌ی بررسی پرداخت ادمین، با دلیل اجباری. قابل لغو: در انتظار پرداخت، رسید ردشده، در حال آماده‌سازی (رسیدِ در بررسی ابتدا تأیید یا رد شود). بازگشت **کل `grandTotal` به کیف پول** (حتی برای کارت به کارت) داخل `transitionOrderStatus()` تا هر مسیر لغوی آن را اعمال کند؛ لغو سفارش پرداخت‌شده بدون ادمین (actor) ممکن نیست |
| ۱۴۰۵/۰۷/۰۱ | ذخیره‌ی رسید | همیشه روی **دیسک خصوصی سرور** (`PRIVATE_STORAGE_DIR`، پیش‌فرض `storage/private`، در `.gitignore`)، مستقل از `STORAGE_DRIVER`. تبدیل به WebP بدون متادیتا (حداکثر ۲۴۰۰px، کیفیت ۸۵)، نام uuid. `Payment.receiptImageUrl` کلید فایل خصوصی را نگه می‌دارد (نه آدرس عمومی). سرو فقط از `/api/receipts/[paymentId]` برای صاحب سفارش یا ادمین با `Cache-Control: private, no-store`؛ بدون دسترسی ⇒ ۴۰۴ |
| ۱۴۰۵/۰۷/۰۱ | قواعد رسید | در هر دور بررسی یک رسید؛ در `PAYMENT_REVIEW` تعویض رسید ممکن نیست. پس از رد، پرداخت تازه ساخته می‌شود تا سابقه‌ی رسید ردشده و دلیلش بماند. تاریخ واریز (ورودی متنی شمسی) بین روز ثبت سفارش و امروز؛ شماره‌ی پیگیری ۴ تا ۳۰ رقم/حرف لاتین؛ ۴ رقم آخر کارت اجباری. آپلود با route handler (نه Server Action) به‌خاطر حجم فایل |
| ۱۴۰۵/۰۷/۰۱ | idempotency مالی | همه‌ی تغییرات مالی با `UPDATE` شرطی: وضعیت پرداخت (`where status = SUBMITTED/PENDING`)، `paidAt` (`where paidAt IS NULL`)، کسر کیف پول (`where walletBalance >= amount`). درخواست تکراری یا هم‌زمان ⇒ پیام «قبلاً … شده» بدون اثر مالی، انتقال یا رویداد دوباره |
| ۱۴۰۵/۰۷/۰۱ | AuditLog مالی | `payment.receipt_submitted`، `payment.approved`، `payment.rejected`، `payment.wallet_paid`، `order.canceled`، `order.refunded_to_wallet` — هرکدام در همان تراکنش عمل |
| ۱۴۰۵/۰۷/۰۱ | مسیرهای پرداخت | مشتری: `/checkout/pay/[orderNumber]` (دکمه از صفحه‌ی موفقیت سفارش). ادمین: `/admin/payments` (تب‌های در انتظار بررسی/تأییدشده/ردشده/همه؛ صف بررسی قدیمی‌ترین اول) و `/admin/payments/[id]` |
| ۱۴۰۵/۰۷/۰۱ | بررسی ledger | `npm run check:wallet`: برای هر کاربر جمع CREDIT − DEBIT و `balanceAfter` آخرین تراکنش باید برابر `walletBalance` باشد (تجمیع در SQL)؛ ناهمخوانی ⇒ خروج با کد ۱. تست‌های یکپارچه رسیدها را در پوشه‌ی موقت می‌نویسند |
| ۱۴۰۵/۰۷/۰۱ | صفحه‌ی سفارش‌های ادمین در فاز ۱۰ | نسخه‌ی ساده: `/admin/orders` (تب‌های آماده‌ی ارسال/ارسال‌شده/همه؛ صف ارسال قدیمی‌ترین پرداخت اول) و `/admin/orders/[id]` (فرم «ثبت ارسال» با کد رهگیری، «تحویل شد»، لغو، وضعیت پیامک‌های سفارش). فیلتر/جستجو/CSV همچنان در فاز ۱۲ |
| ۱۴۰۵/۰۷/۰۱ | گیرنده‌ی پیامک سفارش | موبایل **حساب مشتری** (نه گیرنده‌ی آدرس) |
| ۱۴۰۵/۰۷/۰۱ | زمان ارسال پیامک | پس از commit با `after()` نکست (پس از فرستادن پاسخ، تا کندی ملی پیامک کاربر را معطل نکند)؛ بیرون از درخواست (job/تست) همان‌جا منتظر می‌ماند. هر خطا فقط در `NotificationLog` ثبت می‌شود |
| ۱۴۰۵/۰۷/۰۱ | تلاش دوباره‌ی پیامک | سقف **۳ تلاش کل** (اولین ارسال + `npm run job:retry-notifications`). «در انتظار»ی که بیش از ۱۰ دقیقه مانده هم دوباره فرستاده می‌شود. نوبت ارسال با `UPDATE` شرطی روی تعداد تلاش گرفته می‌شود تا دو اجرای هم‌زمان یک پیامک را دوبار نفرستند. دکمه‌ی «تلاش دوباره» در ادمین هم تا همان سقف |
| ۱۴۰۵/۰۷/۰۱ | قالب مقادیر پیامک | ارقام لاتین؛ مبلغ با جداکننده‌ی کاما (`357,000`). کد رهگیری کامل در سفارش ذخیره می‌شود ولی در پیامک `;`/«؛» و کاراکترهای کنترلی پاک می‌شوند (`sanitizeSmsArg`) |
| ۱۴۰۵/۰۷/۰۱ | تنظیمات پیامک | `Setting` با کلیدهای `sms.templates` و `sms.patterns` در `/admin/notifications/settings`. شناسه‌ی الگوی خالی ⇒ مقدار `.env`. متن فقط برای پیش‌نمایش، حالت console و لاگ است (متن واقعی در پنل ملی پیامک)؛ باید دقیقاً متغیرهای `{1}…{n}` همان رویداد را داشته باشد. لاگ پیامک‌ها در `/admin/notifications` |
| ۱۴۰۵/۰۷/۰۱ | کد رهگیری | اجباری هنگام «ثبت ارسال»، ۳ تا ۶۰ کاراکتر (برای پیک می‌تواند نام و شماره‌ی پیک باشد) |
| ۱۴۰۵/۰۷/۰۱ | seed و تنظیمات | seed تنظیمات موجود را دیگر بازنویسی نمی‌کند (فقط اگر نبود می‌سازد) تا ویرایش‌های ادمین حفظ شود. متن پیش‌فرض پیامک‌ها از `lib/notification-templates.ts` |
| ۱۴۰۵/۰۷/۰۱ | پنل کاربر | `/account` با تب‌های سفارش‌ها (`/account/orders` و `/account/orders/[orderNumber]`)، آدرس‌ها، کیف پول و پروفایل. آیکون حساب هدر، تب «حساب من» موبایل و دکمه‌ی منوی موبایل به `/account` می‌روند (مهمان ⇒ ورود و بازگشت) |
| ۱۴۰۵/۰۷/۰۱ | لغو توسط مشتری | در «در انتظار پرداخت» **و** «رسید تأیید نشد» (هر دو پرداخت‌نشده)؛ رسیدِ در بررسی و سفارش پرداخت‌شده فقط توسط ادمین. لغو، کد تخفیف را آزاد می‌کند |
| ۱۴۰۵/۰۷/۰۱ | پروفایل کاربر | فقط نام و ایمیل؛ موبایل شناسه‌ی ورود است و تغییر نمی‌کند |
| ۱۴۰۵/۰۷/۰۱ | نقش و وضعیت کاربر | ادمین می‌تواند نقش (مشتری/ادمین) و فعال‌بودن کاربر را تغییر دهد، جز برای حساب خودش؛ آخرین ادمین فعال حذف نمی‌شود (با قفل مشورتی در برابر تغییر هم‌زمان). تغییر نقش یا غیرفعال‌سازی ⇒ همه‌ی نشست‌های کاربر باطل. هر ویرایش ⇒ `AuditLog` (`user.updated` با قبل/بعد) |
| ۱۴۰۵/۰۷/۰۱ | شارژ/کسر دستی کیف پول | ledger + کش + `AuditLog` (`wallet.admin_credit`/`wallet.admin_debit`) در یک تراکنش؛ یادداشت اجباری (۳ تا ۳۰۰ کاراکتر، فقط برای ادمین — به مشتری نمایش داده نمی‌شود)؛ کسر بیش از موجودی رد می‌شود؛ سقف هر تغییر ۱ میلیارد تومان. هر فرم یک `requestId` یکتا دارد تا کلیک دوباره تراکنش دوم نسازد |
| ۱۴۰۵/۰۷/۰۱ | جستجوی کاربران | موبایل (ارقام فارسی هم)، نام یا ایمیل؛ نمایش ۱۰۰ نتیجه‌ی اول (جدیدترین) |
| ۱۴۰۵/۰۷/۰۱ | تعریف «فروش» | سفارش **پرداخت‌شده (`paidAt`) و لغونشده**، به **تاریخ ثبت سفارش** (`placedAt`)، با مبلغ `grandTotal`. تخفیف جداگانه گزارش می‌شود. سفارش پرداخت‌شده‌ای که لغو و وجهش به کیف پول برگشته فروش نیست |
| ۱۴۰۵/۰۷/۰۱ | بازه‌های گزارش | کارت‌های داشبورد **تقویمی**: امروز، این هفته (از شنبه)، این ماه (از اول ماه شمسی). فیلتر گزارش: امروز / ۷ روز اخیر / ۳۰ روز اخیر / بازه‌ی دلخواه شمسی (حداکثر ۳۶۶ روز). همه نیم‌باز به وقت تهران؛ نمودار فروش همیشه روزانه (روزهای بی‌فروش صفر) |
| ۱۴۰۵/۰۷/۰۱ | سهم دسته و پرفروش‌ها | بر اساس مبلغ اقلام (`lineTotal`، پیش از تخفیف و بدون ارسال) و تعداد؛ دسته = دسته‌ی فعلی محصول (محصول حذف‌شده ⇒ «بدون دسته»)؛ نام از اسنپ‌شات سفارش؛ ۱۰ ردیف اول به ترتیب مبلغ. میانگین سبد = `AVG(grandTotal)` گرد به تومان. همه‌ی تجمیع‌ها با `$queryRaw` در SQL |
| ۱۴۰۵/۰۷/۰۱ | داشبورد | `/admin` (به‌جای انتقال به محصولات) + آیتم «داشبورد» در منو |
| ۱۴۰۵/۰۷/۰۱ | جدول سفارش‌ها و CSV | `/admin/orders`: چیپ وضعیت، بازه‌ی تاریخ ثبت (شمسی)، جستجوی شماره‌ی سفارش یا موبایل (ارقام فارسی هم)، ۵۰ ردیف در صفحه. «خروجی CSV» با همان فیلترها از `/api/admin/orders/export` (فقط ادمین): UTF-8 با BOM برای Excel، ارقام لاتین، تاریخ شمسی، خنثی‌سازی فرمول (`= + - @`)، حداکثر ۱۰٬۰۰۰ ردیف |
| ۱۴۰۵/۰۷/۰۱ | کتابخانه‌ی نمودار | `recharts` ^3.10 (طبق بخش ۲ سند) + `react-is` هم‌نسخه‌ی React 19 (peer dependency آن) |
| ۱۴۰۵/۰۷/۰۱ | داده‌ی نمایشی گزارش | `npm run db:seed:demo` (فقط توسعه؛ در production خطا می‌دهد): ۶ مشتری `09980000001…` و حدود ۵۰ سفارش `DEMO-…` در ۴۵ روز اخیر با وضعیت‌های مختلف و کد `DEMO10`؛ در پایان جمع دستی فروش ۳۰ روز اخیر را چاپ می‌کند تا با داشبورد مقایسه شود. `-- --clean` فقط پاک می‌کند |
| ۱۴۰۵/۰۷/۰۲ | محتوای قابل ویرایش سایت | اطلاعات تماس، شبکه‌های اجتماعی، شعب (حداکثر ۶)، سه کاشی نوار اعتماد، چهار آمار «درباره ما» و متن «ارسال و نگهداری» در یک Setting با کلید `site.content`؛ هر بخشِ نبود/نامعتبر به پیش‌فرض `site-content.ts` برمی‌گردد. پیش‌فرض متن‌ها «ارسال در شهر تهران» شد. بقیه‌ی متن‌های صفحات در کد می‌مانند |
| ۱۴۰۵/۰۷/۰۲ | صفحات تنظیمات ادمین | `/admin/settings` با تب‌های عمومی (سقف تعداد + محتوا)، کارت‌های بانکی، روش‌های ارسال، شعب و لینک «پیامک‌ها». هر ذخیره/حذف در AuditLog (`settings.*`، شماره کارت ماسک‌شده) و بازسازی کش کاتالوگ/فروشگاه. کارت: Luhn؛ شبا: `IR` + ۲۴ رقم با mod 97؛ استان‌های روش ارسال فقط از مناطق تحت پوشش |
| ۱۴۰۵/۰۷/۰۲ | seed و تنظیمات | کارت بانکی و روش‌های ارسال seed فقط «ایجاد اگر نبود» (`update: {}`) تا ویرایش ادمین بازنویسی نشود. کارت نمونه یک شماره‌ی معتبر از نظر Luhn است و باید پیش از انتشار عوض شود |
| ۱۴۰۵/۰۷/۰۲ | build بدون دیتابیس | ایمیج Docker با `BUILD_WITHOUT_DB=1` ساخته می‌شود (صفحات ISR با داده‌ی خالی/پیش‌فرض). پس از راه‌اندازی، سرویس `jobs` با `POST /api/revalidate` (هدر `x-revalidate-secret` = `REVALIDATE_SECRET` ≥ ۳۲ کاراکتر، مقایسه‌ی timing-safe؛ بدون secret ⇒ ۴۰۴) کل کش را بازسازی می‌کند. layout ادمین `force-dynamic` است |
| ۱۴۰۵/۰۷/۰۲ | سرآیندهای امنیتی | CSP با `script-src 'self' 'unsafe-inline'` (بدون nonce تا صفحات ISR/استاتیک بمانند)، `object-src 'none'`، `frame-ancestors 'none'`، `form-action 'self'`؛ تصاویر فقط self/data/blob و میزبان S3. به‌علاوه‌ی X-Frame-Options، nosniff، Referrer-Policy، Permissions-Policy و HSTS (فقط production) |
| ۱۴۰۵/۰۷/۰۲ | پایش و لاگ | `GET /api/health` (`SELECT 1` با مهلت ۳ ثانیه ⇒ ۲۰۰/۵۰۳، بدون کش). لاگ ساختاریافته‌ی JSON یک‌خطی (`src/lib/logger.ts`) + `onRequestError` در `instrumentation.ts` (مسیر بدون query). ابزار خارجی (Sentry و…) اضافه نشد |
| ۱۴۰۵/۰۷/۰۲ | انقضای سفارش | `npm run job:expire-orders` (هر ساعت): سفارش «در انتظار پرداخت» یا «رسید رد شده»، پرداخت‌نشده، که ۷۲ ساعت از آخرین تغییر وضعیتش گذشته ⇒ لغو خودکار با همان `transitionOrderStatus` (آزادسازی کد تخفیف، پیامک لغو) و یادداشت «لغو خودکار» |
| ۱۴۰۵/۰۷/۰۲ | بررسی سلامت مالی | `npm run check:finance` (روزانه؛ خروج ۱ در صورت مغایرت): ledger کیف پول، `usedCount` کدها با redemptionها، فرمول مبلغ سفارش (جمع اقلام، سقف تخفیف، `grandTotal`) و وجود پرداخت تأییدشده با مبلغ برابر برای هر سفارش پرداخت‌شده |
| ۱۴۰۵/۰۷/۰۲ | معماری استقرار | `docker-compose.prod.yml`: `postgres`، `migrate` (`prisma migrate deploy` پیش از app)، `app` (standalone، کاربر غیر root، healthcheck)، `jobs` (حلقه‌ی ۱۰ دقیقه‌ای: retry پیامک، انقضا هر ساعت، بررسی مالی روزانه)، `backup` و `caddy` (HTTPS خودکار، سقف بدنه ۸MB). میرورهای npm/Prisma با build arg. راهنما در `DEPLOYMENT.md` |
| ۱۴۰۵/۰۷/۰۲ | بکاپ | سرویس `backup`: هر روز ساعت ۳ بامداد تهران `pg_dump -Fc` + tar تصاویر و رسیدها در `BACKUP_PATH` روی سرور، نگهداری ۱۴ روز؛ `restore.sh` برای بازگردانی (روند کامل روی پشته‌ی آزمایشی آزموده شد). نسخه‌ی خارج از سرور بر عهده‌ی بهره‌بردار (rsync در DEPLOYMENT.md) |
| ۱۴۰۵/۰۷/۰۲ | تست‌های E2E | Playwright (`@playwright/test`، فقط Chromium) روی `next dev` پورت ۳۳۰۰ و دیتابیس توسعه: ورود OTP، سفارش با کد تخفیف، آپلود رسید، تأیید ادمین. کد OTP از فایل outbox پیامک کنسولی (`SMS_CONSOLE_OUTBOX`) خوانده می‌شود؛ setup محدودیت نرخ را پاک و کد تخفیف یکتا می‌سازد، teardown همه‌ی داده‌ی مشتری تست را پاک می‌کند. ادمین seed لازم است |
| ۱۴۰۵/۰۷/۰۲ | دسترس‌پذیری (Lighthouse) | رنگ `faint` به `#88968d` تغییر کرد (کنتراست ≥ ۴٫۵ روی canvas/panel/card)، عنوان آکاردئون صفحه‌ی محصول `h2` شد، favicon (`src/app/icon.svg` از نشان موقت) و متن لینک «درباره ما» توصیفی شد |
| ۱۴۰۵/۰۷/۰۲ | ورود با رمز عبور (پس از فاز ۱۳) | تا اگر ملی پیامک در دسترس نبود ورود مختل نشود. ثبت‌نام همچنان با OTP است و **تعیین رمز پس از آن اجباری است**: کاربرِ بدون رمز در `getCurrentUser()` واردشده حساب نمی‌شود و فقط به `/set-password` دسترسی دارد (همه‌ی صفحات/اکشن‌ها/APIهای محافظت‌شده خودکار پوشش داده می‌شوند). کاربران قدیمی بدون رمز هم در ورود بعدی باید رمز بگذارند |
| ۱۴۰۵/۰۷/۰۲ | صفحه‌ی ورود با رمز | اول شماره، بعد روش: کاربر رمزدار ⇒ فرم رمز (بدون پیامک) + «ورود با کد پیامکی» و «فراموشی رمز»؛ کاربر جدید/بدون رمز ⇒ مستقیم کد پیامکی. این گام فاش می‌کند شماره رمز دارد یا نه (پذیرفته‌شده)؛ با محدودیت ۳۰ بررسی در ۱۰ دقیقه برای هر IP. خطای ورود با رمز همیشه کلی است («شماره یا رمز نادرست») |
| ۱۴۰۵/۰۷/۰۲ | قانون و ذخیره‌ی رمز | حداقل ۸ و حداکثر ۱۲۸ کاراکتر، دست‌کم یک حرف و یک عدد؛ ارقام فارسی به لاتین و یونیکد به NFC نرمال می‌شوند. هش با `scrypt` داخلی Node (N=2^15, r=8, p=3، پارامترها در رشته‌ی هش) — بدون کتابخانه‌ی جدید. فیلدهای `User.passwordHash`/`passwordChangedAt` و `Session.method` (`OTP`/`PASSWORD`) |
| ۱۴۰۵/۰۷/۰۲ | محدودیت تلاش رمز | تلاش ناموفق: ۵ بار در ۱۵ دقیقه برای هر شماره و ۲۰ بار برای هر IP (سپس پیشنهاد ورود با کد پیامکی)؛ بررسی رمز فعلی هنگام تغییر: ۵ بار در ۱۵ دقیقه برای هر کاربر |
| ۱۴۰۵/۰۷/۰۲ | تغییر و فراموشی رمز | «حساب من ← پروفایل ← تغییر رمز عبور» با رمز فعلی. «فراموشی رمز» = ورود با کد پیامکی و سپس رمز جدید بدون رمز فعلی (نشست OTP کمتر از ۱۵ دقیقه). پس از تعیین/تغییر رمز همه‌ی نشست‌های دیگر کاربر باطل و رویداد در AuditLog (`auth.password_set`/`auth.password_changed`) ثبت می‌شود |
| ۱۴۰۵/۰۷/۰۲ | بازیابی بدون پیامک | `npm run user:set-password -- <موبایل>` روی سرور (رمز از ورودی خوانده می‌شود، نه آرگومان)؛ همه‌ی نشست‌های کاربر را باطل می‌کند. برای ادمینی که رمز را فراموش کرده یا اولین ورود پیش از آماده شدن پنل پیامک |
| ۱۴۰۵/۰۷/۰۳ | منوی شعبه‌ها (QR) | هر شعبه منوی **مستقل** دارد (مدل‌های `Menu` ← `MenuCategory` ← `MenuItem`؛ جدا از کاتالوگ فروشگاه و بدون هیچ منطق موجودی). صفحه‌ی عمومی `/menu/<slug>` با نشانی کوتاه لاتین (مثل `valiasr`) تا QR ساده بماند؛ منوی غیرفعال ⇒ ۴۰۴، دسته‌ی خالی نمایش داده نمی‌شود، در sitemap نیست. ساخت منوی جدید می‌تواند «کپی از منوی دیگر» باشد |
| ۱۴۰۵/۰۷/۰۳ | آیتم منو | نام، توضیح کوتاه (اختیاری)، قیمت تومانی و تصویر بندانگشتی: مربع ۳۲۰ پیکسل WebP با برش هوشمند (`menu/<uuid>.webp`، از همان مسیر `/api/media`). تصاویرِ کپی‌شده بین منوها مشترک‌اند و فایل فقط وقتی هیچ آیتمی به آن اشاره نکند حذف می‌شود |
| ۱۴۰۵/۰۷/۰۳ | چینش منو | drag & drop با `@dnd-kit/core` + `sortable` (تأیید کاربر): موس، لمس (با کمی مکث) و کیبورد؛ دسته‌ها و آیتم‌های هر دسته جداگانه. ذخیره‌ی خوش‌بینانه و سرور بررسی می‌کند فهرست دقیقاً همان مجموعه‌ی فعلی باشد. انتقال آیتم به دسته‌ی دیگر از فرم آیتم (به انتهای آن دسته) |
| ۱۴۰۵/۰۷/۰۳ | QR code منو | کتابخانه‌ی `qrcode` (تأیید کاربر، فقط سمت سرور): پیش‌نمایش SVG در صفحه‌ی ادمین، دانلود PNG ۱۰۲۴ پیکسل (`/api/admin/menus/<id>/qr`، فقط ادمین) و SVG برای چاپخانه؛ سطح تصحیح خطای M. آدرس از `NEXT_PUBLIC_SITE_URL` ساخته می‌شود؛ تغییر نشانی منو QRهای چاپ‌شده را باطل می‌کند (هشدار در فرم) |
| ۱۴۰۵/۰۷/۰۳ | شماره‌گذاری متغیر پیامک | طبق راهنمای وب‌سرویس خدماتی اشتراکی ملی پیامک، متغیرهای الگو از **`{0}`** شماره می‌خورند (نه `{1}`) و مقادیر با `;` جدا فرستاده می‌شوند؛ انتهای هر الگو نشانی سایت اجباری است. متن‌های ذخیره‌شده‌ی قبلی (`sms.templates`) در migration پاک شدند تا پیش‌فرض‌های تازه جایگزین شوند |
| ۱۴۰۵/۰۷/۰۳ | پیامک‌های جدید | مشتری: «لغو سفارش» (لغو ادمین و لغو خودکار ۷۲ ساعته). مدیر: «رسید جدید برای بررسی» (هر ورود به PAYMENT_REVIEW) و «پرداخت با کیف پول» (ورود مستقیم به PROCESSING). پیامک‌های مشتری با نام گیرنده‌ی سفارش شروع می‌شوند (حداکثر ۳۰ نویسه، خالی ⇒ «مشتری»). هر رویداد هنوز فقط یک‌بار برای هر سفارش فرستاده می‌شود (`unique(orderId, type)`)؛ یعنی رسیدِ دوباره پس از رد، پیامک مدیرِ دوم ندارد |
| ۱۴۰۵/۰۷/۰۳ | گیرنده‌ی پیامک مدیر | یک شماره در «پیامک‌ها ← متن و الگو» (`sms.adminPhone`) یا `SMS_ADMIN_PHONE`؛ خالی ⇒ پیامک مدیر ساخته نمی‌شود. لاگ این پیامک‌ها `userId = null` دارد |
| ۱۴۰۵/۰۷/۰۳ | ویرایش کامل پیامک‌ها از پنل | «پیامک‌ها ← متن و الگو» برای **همه‌ی** پیامک‌ها (از جمله کد ورود): متن، **ترتیب متغیرها** (`sms.variables`؛ هر جایگاه `{n}` یک متغیر از فهرست مجاز همان پیامک، حداکثر ۶) و شناسه‌ی الگو؛ بدون تغییر کد. متغیرهای مجاز: کد ورود فقط «کد»؛ پیامک‌های مشتری نام، شماره‌ی سفارش، مبلغ (+ کد رهگیری در ارسال)؛ پیامک‌های مدیر به‌علاوه‌ی موبایل مشتری. متن و ترتیب ناهمخوان ذخیره نمی‌شود و اگر در دیتابیس ناهمخوان باشد، پیش‌فرض همان پیامک استفاده می‌شود |
| ۱۴۰۵/۰۷/۰۴ | تنظیمات .env در پنل | «تنظیمات ← اتصال‌ها و سرور»: روش ارسال، نام کاربری و رمز/ApiKey ملی پیامک از پنل (`sms.connection`؛ مقدم بر .env، بدون راه‌اندازی دوباره) + دکمه‌ی «بررسی اتصال و اعتبار» (متد GetCredit). رمز با AES-256-GCM و کلید مشتق از `AUTH_SECRET` در دیتابیس ذخیره می‌شود، هرگز به مرورگر یا AuditLog نمی‌رود؛ تغییر `AUTH_SECRET` ⇒ باید دوباره وارد شود. بقیه‌ی متغیرها (دیتابیس، AUTH_SECRET، REVALIDATE_SECRET، دامنه/آدرس سایت، S3، بکاپ، میرورهای ساخت) ذاتاً پیش از دیتابیس یا هنگام build یا بیرون از اپ لازم‌اند و فقط **وضعیتشان** (بدون مقدار محرمانه) در همان صفحه نمایش داده می‌شود |
| ۱۴۰۵/۰۷/۰۴ | لاگ کد ورود و وضعیت تحویل | هر ارسال کد ورود در «پیامک‌ها»ی پنل ثبت می‌شود (نوع `OTP`، بدون سفارش؛ **خود کد ذخیره نمی‌شود** و به‌جایش `••••••`) با recId یا علت شکست؛ کد ورود هرگز دوباره فرستاده نمی‌شود. دکمه‌ی «وضعیت تحویل» برای هر پیامک ارسال‌شده (متد GetDeliveries2 ملی پیامک: رسیده به گوشی، نرسیده، لیست سیاه، فیلترشده، …). تست‌های یکپارچه و e2e تنظیمات ذخیره‌شده‌ی پنل را فقط کنار می‌گذارند و دقیقاً برمی‌گردانند (`src/test/settings-snapshot.ts`) |
| ۱۴۰۵/۰۷/۰۴ | فرم رسید فقط تصویر | به درخواست کارفرما شماره‌ی پیگیری، ۴ رقم آخر کارت و تاریخ واریز از فرم رسید حذف شد (ستون‌ها در `Payment` اختیاری ماندند تا رسیدهای قدیمی نمایش داده شوند؛ پنل ادمین فقط در صورت وجود نشانشان می‌دهد). بررسی رسید فقط با تصویر |
| ۱۴۰۵/۰۷/۰۴ | فقط «ارسال با پیک» | یک روش ارسال فعال: «ارسال با پیک»، هزینه‌ی پیک جداگانه درب منزل توسط مشتری. فیلد جدید `ShippingMethod.payOnDelivery` (هزینه و آستانه در سایت ۰) و عکس آن روی سفارش `Order.shippingPayOnDelivery`؛ همه‌جا به‌جای «رایگان» برچسب «درب منزل، به پیک» نمایش داده می‌شود. روش‌های قبلی غیرفعال (نه حذف) شدند و seed فقط همین روش را می‌سازد |
| ۱۴۰۵/۰۷/۰۴ | حالت بروزرسانی (maintenance) | کلید «حالت بروزرسانی» در «تنظیمات ← عمومی» (`site.maintenance`: روشن/خاموش + پیام اختیاری، با AuditLog). middleware روی همه‌ی مسیرها اجرا می‌شود: غیرادمین ⇒ rewrite به `/maintenance` با وضعیت **503** و `Retry-After`؛ ادمینِ واردشده (نقش از JWT) سایت را عادی می‌بیند با نوار «فقط شما می‌بینید» (کوکی غیرمحرمانه تا صفحات ISR پویا نشوند). معاف: `/menu/*` (QR)، `/login`، `/set-password`، `/admin`، `/api`، فایل‌های ثابت. وضعیت در middleware حداکثر ۵ ثانیه کش می‌شود و خطای دیتابیس سایت را نمی‌بندد |
| ۱۴۰۵/۰۷/۰۵ | نماد اینماد در فوتر | فیلد «کد اینماد» در «تنظیمات ← عمومی» با پیش‌نمایش. کد HTML اینماد **مستقیم درج نمی‌شود** (XSS)؛ فقط `id` و `Code` با الگوی سخت‌گیرانه استخراج و در `site.content.enamad` ذخیره می‌شوند و فوتر نشان استاندارد را با آدرس‌های رسمی `trustseal.enamad.ir` و `referrerpolicy="origin"` (شرط اعتبارسنجی اینماد) می‌سازد. CSP: `img-src` شامل `https://trustseal.enamad.ir` |
| ۱۴۰۵/۰۷/۰۵ | لوگوی رسمی | فایل لوگوی سفید کارفرما (برای پس‌زمینه‌ی تیره) بریده و در `public/brand/logo-white.webp` (۵۰۷×۲۰۰) قرار گرفت؛ کامپوننت `Logo` همه‌جا (هدر، منوی موبایل، فوتر، ورود، منوی شعبه، صفحه‌ی بروزرسانی) از آن استفاده می‌کند. `LogoMark` (کمان‌ها) فقط برای جاهای کوچک ماند |
| ۱۴۰۵/۰۷/۰۵ | بنرها و اسلایدر از پنل | «تنظیمات ← بنرها و اسلایدر» (`site.banners`): اسلایدر صفحه‌ی اصلی (حداکثر ۶ اسلاید؛ متن بالای عنوان، عنوان ۲ خطی، زیرعنوان، متن و لینک داخلی دکمه، ترتیب) + تصویر ۶ بنر دیگر (بنر تبلیغاتی و داستان صفحه‌ی اصلی، بنر بالای درباره ما/شعب/تماس، تصویر داستان درباره ما). هر تصویر **دو نسخه‌ی دسکتاپ و موبایل** دارد (`<picture>` با breakpoint ۷۶۸؛ موبایل اختیاری ⇒ دسکتاپ با برش وسط)، چون کادرهای موبایل تقریباً مربع‌اند (مثلاً اسلایدر ۲٫۷:۱ در دسکتاپ و ~۱٫۲:۱ در موبایل). اندازه‌های پیشنهادی از ابعاد واقعی کادرها (با ۲ برابر برای نمایشگر رتینا) محاسبه و کنار هر تصویر در پنل نمایش داده می‌شود. آپلود: WebP، کوچک‌سازی تا عرض ۲۴۰۰ (دسکتاپ) / ۱۰۸۰ (موبایل) بدون برش؛ فقط آدرس‌های `banners/` خود سایت پذیرفته و فایل‌های جایگزین‌شده پس از ذخیره پاک می‌شوند |
| ۱۴۰۵/۰۷/۰۵ | حذف سفارش و پرداخت توسط ادمین | «حذف دائمی سفارش» در صفحه‌ی سفارش (تأیید با تایپ شماره‌ی سفارش): اقلام، پرداخت‌ها، تصویر رسیدها، تاریخچه و redemption حذف و `usedCount` کد کم می‌شود؛ **تراکنش‌های کیف پول حذف نمی‌شوند** (فقط `orderId` آن‌ها null؛ ledger سالم می‌ماند — برای بازگشت پول، اول لغو)؛ لاگ پیامک‌ها می‌مانند؛ خلاصه در AuditLog (`order.deleted`) و شماره‌ی سفارش حذف‌شده دوباره داده نمی‌شود (`nextOrderSequence` شماره‌های AuditLog را هم در نظر می‌گیرد). حذف پرداخت به‌تنهایی فقط برای وضعیت PENDING/REJECTED (تأییدشده ⇒ فقط با حذف سفارش، در حال بررسی ⇒ اول رد/تأیید) |
| ۱۴۰۵/۰۷/۰۵ | سئو فاز S0: مدل داده | طبق `SEO.md` §۶ در migration جدید `seo_s0`: `Product.metaTitle` با `RENAME COLUMN` به `seoTitle` تغییر نام داد (داده حفظ شد) و فیلدهای `focusKeyword`، `secondaryKeywords`، `noindex`، `canonicalUrl`، `ogImageUrl`، `faq`، `archivedAt`، `archiveRedirectTo` اضافه شد. `ProductImage.alt` الزامی شد (alt خالی قبلی با نام محصول پر شد) + `ogUrl`/`width`/`height` (فعلاً اختیاری تا فاز S2). فیلدهای سئوی `Category` + `updatedAt`. مدل‌های `SlugHistory`، `Redirect`، `NotFoundLog`، `Branch`، `Page` فقط جدول‌اند؛ پنل و استفاده در S1/S4 |
| ۱۴۰۵/۰۷/۰۵ | کاتالوگ seed جایگزین نمونه‌ها | `prisma/seed-catalog.ts` + `seed-categories.ts`: ۱۲ محصول و ۴ دسته با نامک لاتین و فیلدهای سئوی `SEO.md` §۲؛ محصولات **غیرفعال و بدون متغیر** (قیمت/وزن/تصویر داده‌ی کسب‌وکار است و ادمین وارد و بعد فعال می‌کند). ۸ محصول نمونه با نامک دقیقشان حذف می‌شوند (اقلام سفارش snapshot دارند)؛ دسته‌ی نمونه فقط اگر خالی باشد. seed دیگر رکورد موجود را بازنویسی نمی‌کند و فقط فیلدهای خالی را پر می‌کند. e2e محصول تست خودش را می‌سازد |
| ۱۴۰۵/۰۷/۰۵ | alt پیش‌فرض تصویر | آپلود تصویر محصول alt را `{نام محصول} {seo.brandName}` و برای تصاویر بعدی با شماره (`… ۲`) می‌گذارد (`src/lib/seo/image-alt.ts`)؛ ویرایش alt در فرم در فاز S2 |
| ۱۴۰۵/۰۷/۰۵ | سئو فاز S1: نامک لاتین | نامک محصول و دسته فقط `[a-z0-9-]`، حداکثر ۶۰ کاراکتر و **الزامی** (SEO.md §۴.۲). از نام فارسی ساخته نمی‌شود (آوانگاری خودکار نامک بد و ماندگار می‌سازد)؛ برای نام لاتین پیشنهاد خودکار دارد. تغییر نامک در همان تراکنش ویرایش یک ردیف `SlugHistory` می‌سازد (برگشت به نامک قدیمی آن ردیف را حذف می‌کند) |
| ۱۴۰۵/۰۷/۰۵ | متن بلند: قالب ساده به‌جای HTML | توضیحات محصول، متن پایین دسته و `seo.home.content` در قالب `src/lib/rich-text.ts` ذخیره می‌شوند: خط خالی = پاراگراف، `##`/`###` سرتیتر، `- ` فهرست، `[متن](/آدرس)` لینک، `**پررنگ**`. HTML خام نه ذخیره و نه رندر می‌شود (کامپوننت `RichText`)؛ برای ادمین مبتدی ساده‌تر و ذاتاً امن است. لینک فقط `/…` داخلی یا `https://` |
| ۱۴۰۵/۰۷/۰۵ | حذف محصول = بایگانی | جایگزین soft delete قبلی: «حذف» محصول را بایگانی می‌کند (غیرفعال + `archivedAt` + مقصد ریدایرکت 301، پیش‌فرض دسته‌ی محصول)؛ محصول بایگانی‌شده فعال نمی‌شود مگر از بایگانی خارج شود. «حذف دائمی» فقط برای بایگانی‌شده‌ی بدون سفارش؛ آدرس فعلی و نامک‌های قبلی به ردیف‌های `Redirect` ثابت تبدیل می‌شوند. حذف دسته‌ی خالی هم آدرسش را به دسته‌ی والد یا `/products` ریدایرکت می‌کند. اجرای ریدایرکت‌ها در middleware در فاز S3/S4 |
| ۱۴۰۵/۰۷/۰۵ | فرم دسته صفحه‌ی کامل | مودال دسته با فیلدهای سئو، متن معرفی/پایین و FAQ جا نمی‌شد؛ `/admin/categories/new` و `/admin/categories/[id]/edit` جایش را گرفتند |
| ۱۴۰۵/۰۷/۰۵ | سئو فاز S2: نام فایل تصویر محصول | به‌جای uuid: `products/{نامک}-{ردیف}-{۴ نویسه‌ی hex}.webp` (مثل `baklava-gerdouyi-1-a3f9.webp`) + `-thumb.webp` + برش OG `-og.jpg`؛ برخورد نام با چک دیتابیس و ساخت دوباره‌ی نویسه‌ها جلوگیری می‌شود. نامک غیرلاتین قدیمی ⇒ `product`. تغییر نامک بعدی نام فایل‌های قبلی را عوض نمی‌کند. **رسیدها همچنان uuid و خصوصی‌اند**؛ مسیر `/api/media` فقط الگوهای عمومی (`publicMediaContentType`) را سرو می‌کند و تصاویر قدیمی uuid هم کار می‌کنند |
| ۱۴۰۵/۰۷/۰۵ | برش OG و ابعاد تصویر | هنگام آپلود: ابعاد فایل اصلی در `ProductImage.width/height` و برش ۱۲۰۰×۶۳۰ با تمرکز sharp «attention» در `ogUrl`. OG به‌صورت **JPEG** (نه WebP) چون برخی پیام‌رسان‌ها پیش‌نمایش WebP نشان نمی‌دهند. تصاویر آپلودشده قبل از S2 ابعاد و OG ندارند؛ جایگزین: خود تصویر اصلی |
| ۱۴۰۵/۰۷/۰۵ | بهینه‌ساز `next/image` روشن | جایگزین تصمیم «`unoptimized` برای تصاویر آپلودی»: تصاویر محصول (کارت، گالری، سبد) از `/_next/image` با `formats: ["image/avif","image/webp"]` و `sizes` درست سرو می‌شوند تا موبایل فایل کوچک‌تر بگیرد (LCP). کش ۳۰ روزه چون نام‌ها تغییرناپذیرند. لوگو و منوی شعب همچنان `unoptimized` |
| ۱۴۰۵/۰۷/۰۵ | ویرایش alt تصویر | کنار هر تصویر در پنل؛ با خروج از فیلد ذخیره می‌شود؛ خالی ⇒ خطای اعتبارسنجی (هم کلاینت، هم اکشن، هم سرویس) |
| ۱۴۰۵/۰۷/۰۵ | سئو فاز S3: محصول غیرفعال | **جایگزین بند ۷.۱**: صفحه‌ی محصول غیرفعال (یا بدون متغیر فعال) 200 می‌ماند با «در حال حاضر قابل سفارش نیست»، بدون دکمه‌ی خرید، با محصولات مرتبط و `OutOfStock` در schema؛ فقط از فهرست‌ها و جستجو پنهان است. محصول بایگانی و نامک قدیمی (SlugHistory) ⇒ `permanentRedirect` (308) مستقیم به مقصد نهایی (بدون زنجیره). بدون قیمت ⇒ schema بدون `offers` |
| ۱۴۰۵/۰۷/۰۵ | `ALLOW_INDEXING` | فقط `true` سایت را برای گوگل باز می‌کند؛ پیش‌فرض بسته (robots.txt `Disallow: /` و متای `noindex, nofollow`). چون صفحه‌ی اصلی هنگام build پیش‌رندر می‌شود، در Docker هم build arg است (`docker-compose.prod.yml` از `.env.production` می‌خواند). robots.txt پویا (`force-dynamic`). در production بسته بودنش بنر قرمز در داشبورد دارد |
| ۱۴۰۵/۰۷/۰۵ | robots و تصاویر | `Allow: /api/media/` کنار `Disallow: /api/` تا گوگل تصاویر محصول (og:image و schema) را بخزد. مسیر رسیدها هدر `X-Robots-Tag: noindex, nofollow` دارد |
| ۱۴۰۵/۰۷/۰۵ | املای برند در متن سایت | متن‌های قابل مشاهده‌ی سایت و پنل «علی حان» (با فاصله) شدند (SEO.md §۱.۳). متن پیش‌فرض پیامک‌ها عمداً تغییر نکرد چون باید با الگوهای تأییدشده‌ی ملی پیامک یکی بماند |
| ۱۴۰۵/۰۷/۰۵ | تنظیمات سئو در پنل | تب «تنظیمات ← سئو»: برند، قالب عنوان، توضیحات و تصویر پیش‌فرض، عنوان/متا/H1/بلوک محتوا/FAQ صفحه‌ی اصلی، نام حقوقی، لوگو و کدهای تأیید Google/Bing. کدهای تأیید به‌صورت متای استاندارد (بدون اسکریپت خارجی) |
| ۱۴۰۵/۰۷/۰۵ | سئو فاز S4: ریدایرکت در middleware | جدول `Redirect` و قواعد الگویی وردپرس (SEO.md §۱۱.۲) در middleware (Node runtime) اجرا می‌شوند، نه در صفحه‌ی catch-all: فقط middleware می‌تواند 410 واقعی بدهد و ریدایرکت‌ها بر صفحات موجود هم مقدم‌اند (مثل آدرس محصول حذف‌شده). جدول در حافظه کش می‌شود (TTL ۶۰ ثانیه؛ تغییر از پنل حداکثر تا یک دقیقه اعمال می‌شود چون middleware نمونه‌ی ماژول جدا دارد). زنجیره تا مقصد نهایی حل می‌شود (یک پرش) و حلقه هنگام ساخت رد می‌شود. `skipTrailingSlashRedirect` روشن است و اسلش انتهایی را خود middleware **بعد از** ریدایرکت‌ها حذف می‌کند تا `/product/x/` وردپرسی در یک پرش به مقصد برسد |
| ۱۴۰۵/۰۷/۰۵ | catch-all و لاگ ۴۰۴ | `(shop)/[...legacy]` (پویا): صفحات ثابت منتشرشده با نامک یک‌بخشی را رندر می‌کند و هر مسیر دیگر را در `NotFoundLog` ثبت و ۴۰۴ واقعی می‌دهد. مسیرهای اسکنرها (wp-login، ‎.env، php، …) ثبت نمی‌شوند. ساخت ریدایرکت برای یک مسیر، آن را از لاگ پاک می‌کند |
| ۱۴۰۵/۰۷/۰۵ | شعب در جدول Branch | شعب از `site.content` با migration داده‌ای به `Branch` منتقل شدند (نامک موقت `branch-N`، شهر خالی، متن ساعات قبلی در `note`) و ویرایشگر قبلی حذف شد. «تنظیمات ← شعب» حالا فهرست و فرم کامل دارد (ساعات روزانه، لینک نشان/بلد/گوگل، مختصات) و `/branches/{slug}` با schema `Bakery`. نقشه جاسازی نمی‌شود (فقط لینک). نام، آدرس و تلفن هر شعبه فقط در `Branch`؛ تماس کلی سازمان همچنان در «تنظیمات ← عمومی» (فوتر، تماس و schema سازمان) |
| ۱۴۰۵/۰۷/۰۵ | صفحات ثابت | مدل `Page` (+ فیلد `faq`) و «صفحات» پنل. «درباره ما» و «تماس» طراحی اختصاصی دارند: نامکشان ثابت و حذف‌نشدنی است و فقط متن/سئوی منتشرشده جای متن پیش‌فرض می‌نشیند. سوالات متداول، ارسال، مرجوعی و حریم خصوصی از catch-all رندر می‌شوند. seed همه را پیش‌نویس منتشرنشده می‌سازد (فقط واقعیت‌های سیستم + `{{تکمیل…}}`). حذف صفحه/شعبه آدرس‌هایش را به ریدایرکت 301 تبدیل می‌کند |
| ۱۴۰۵/۰۷/۰۵ | سئو فاز S5: انتشار | `npm run seo:audit -- <آدرس>` (تحلیل خالص در `src/lib/seo/audit.ts`)، بخش ۱۲ `DEPLOYMENT.md` (ALLOW_INDEXING، دسترسی گوگل‌بات از خارج، دامنه‌ی canonical، Search Console، چک‌لیست انتشار) و ریدایرکت www در `Caddyfile`. نگاشت آدرس‌های سایت قبلی ساخته نشد چون سایت قبلی وجود ندارد |
| ۱۴۰۵/۰۶/۳۰ | اسکریپت‌های `db:*` در فاز ۰ | فقط در `package.json` تعریف شدند (`prisma migrate dev` / `tsx prisma/seed.ts` / `prisma studio`). خود Prisma و `tsx` در **فاز ۱** نصب می‌شوند |
