# BRAND_AUDIT — ممیزی ارجاع‌های علی حان (فاز F1)

> تولیدشده در فاز F1 با جستجو در کل پروژه (به‌جز `docs/archive/`، `docs/FORK_ORIGIN.md`، `FORK.md`، `package-lock.json` و `.env`).
> عبارت‌ها: `علی حان` · `علی‌حان` · `علیحان` · `Alihan/ALIHAN/alihan` · `باقلوا` · `baklava` · `هاویج` · `havij` · `کادایف` · `سوتلاوا` · `کنافه` · `شکلات دبی` · `شیرینی` · `Bakery` · `AL-` · رنگ‌های هگز تم.

## خلاصه

| وضعیت | تعداد |
|---|---|
| اصلاح‌شده در F1 (متمرکز/تغییر نام) | 118 |
| باقی برای F2 | 402 |
| باقی برای F2 (صفحه‌ی اصلی: F6) | 10 |
| باقی برای F7 | 32 |
| رنگ هگز (کل src، برای F6) | 45 |

> نام‌های فنی زیرساخت (docker-compose، `.env*`، `package.json`، نام فایل‌های موقت تست‌ها، `docs/archive`) در فاز F0 تغییر کرده‌اند و در جدول الف نیامده‌اند.

## نگاشت منابع واحد برند (بعد از F1)

| مورد | منبع واحد |
|---|---|
| نام برند در UI/پیامک/عنوان‌ها | `SITE.name` در `src/lib/site-content.ts` (تنها جایی که نام نوشته می‌شود) |
| نام برند در سئو | کلید `seo.brandName` در `Setting`؛ پیش‌فرض = `SITE.name` |
| شناسه‌ی فنی لاتین (کوکی‌ها، salt رمزنگاری) | `SITE.slug` |
| نشانگر جای‌نگهدار `{{تکمیل توسط …}}` | `COMPLETION_MARKER` (از `SITE.name` ساخته می‌شود) |
| پیشوند شماره‌ی سفارش | کلید `order.numberPrefix` در `Setting` (`getOrderNumberPrefix` / `readOrderNumberPrefix`)؛ مقدار پیش‌فرض seed فقط در `DEFAULT_ORDER_NUMBER_PREFIX` |
| نوع schema.org شعبه | `localBusinessJsonLd` با `schemaType` (پیش‌فرض `LocalBusiness`) |

## الف) موارد اصلاح‌شده در F1

| فایل | خط (قبل از تغییر) | دسته | متن قبلی | اقدام |
|---|---|---|---|---|
| `Dockerfile` | 3 | نام فنی (زیرساخت) | `# ایمیج چندمرحله‌ای علی‌حان (بخش ۲ سند: Docker + output: standalone)` | به alocapsule تغییر کرد |
| `prisma/schema.prisma` | 407 | شماره سفارش | `/// خوانا، مثل AL-14040625-0031` | پیشوند از Setting |
| `prisma/seed-demo.ts` | 9 | شماره سفارش | `* شماره‌گذاری واقعی 'AL-…' تداخل نداشته باشد. در پایان جمع دستی فروش ۳۰ روز` | پیشوند از Setting |
| `scripts/seo-audit.ts` | 10 | متن UI / توضیح کد | `* «{{تکمیل توسط علی حان…}}». با خطای 🔴 کد خروج ۱ است.` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(admin)/admin/layout.tsx` | 11 | متن UI / توضیح کد | `title: { default: "مدیریت \| علی حان", template: "%s \| مدیریت علی حان" },` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(admin)/admin/orders/page.tsx` | 91 | شماره سفارش | `placeholder="AL-1405… یا 0912…"` | پیشوند از Setting |
| `src/app/(auth)/login/page.tsx` | 35 | متن UI / توضیح کد | `<h1 className="text-3xl font-extrabold">ورود به علی حان</h1>` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/about/page.tsx` | 30 | متن UI / توضیح کد | `"داستان علی حان؛ هنر باقلواسازی ترکی، مواد اولیه‌ی درجه یک و بسته‌بندی شایسته‌ی هدیه.",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/about/page.tsx` | 47 | متن UI / توضیح کد | `imageLabel="بنر درباره علی حان"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/about/page.tsx` | 124 | متن UI / توضیح کد | `<SectionTitle id="branches-title">شعب علی حان</SectionTitle>` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/account/layout.tsx` | 11 | متن UI / توضیح کد | `title: { default: "حساب کاربری", template: "%s \| حساب کاربری علی حان" },` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/branches/[slug]/page.tsx` | 14 | schema.org | `import { bakeryJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";` | LocalBusiness |
| `src/app/(shop)/branches/[slug]/page.tsx` | 100 | schema.org | `bakeryJsonLd({` | LocalBusiness |
| `src/app/(shop)/branches/page.tsx` | 11 | متن UI / توضیح کد | `description: "آدرس، شماره تماس و ساعات کاری شعب علی حان.",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/branches/page.tsx` | 22 | متن UI / توضیح کد | `title={["شعب علی حان"]}` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/contact/page.tsx` | 28 | متن UI / توضیح کد | `"راه‌های ارتباط با فروشگاه علی حان: تلفن، ایمیل، آدرس و شبکه‌های اجتماعی.",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/contact/page.tsx` | 47 | متن UI / توضیح کد | `title={["تماس با علی حان"]}` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/(shop)/products/page.tsx` | 26 | متن UI / توضیح کد | `"خرید آنلاین انواع باقلوای ترکی، شیرینی هاویج، دسرهای ترکی و شکلات علی حان.",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/app/globals.css` | 3 | رنگ/تم (توضیح) | `/* توکن‌های طراحی — design_handoff_alihan_store/README.md */` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/AdminShell.tsx` | 73 | متن UI / توضیح کد | `علی حان` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/AdminShell.tsx` | 93 | متن UI / توضیح کد | `علی حان` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/CategoryForm.tsx` | 106 | متن UI / توضیح کد | `example="baklava"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/ProductBasicsSection.tsx` | 54 | متن UI / توضیح کد | `example="baklava-gerdouyi"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/ProductImages.tsx` | 126 | متن UI / توضیح کد | `برای هر تصویر یک «متن جایگزین» توصیفی بنویسید (مثلاً «برش باقلوا گردویی` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/content/PageForm.tsx` | 156 | متن UI / توضیح کد | `hint="متن‌های {{تکمیل توسط علی حان…}} را قبل از انتشار با اطلاعات واقعی جایگزین کنید."` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/content/RedirectFormModal.tsx` | 99 | متن UI / توضیح کد | `placeholder="/product/باقلوا-گردویی"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/content/RedirectFormModal.tsx` | 120 | متن UI / توضیح کد | `hint="مسیر داخلی مثل /products/baklava-gerdouyi"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/content/RedirectImport.tsx` | 72 | متن UI / توضیح کد | `"from,to,status\n/product/old-name,/products/baklava-gerdouyi,301\n/old-page,,410"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/menus/MenuEditor.tsx` | 163 | متن UI / توضیح کد | `description="اول یک دسته (مثلاً باقلوا یا دمنوش‌ها) بسازید، بعد آیتم‌ها را اضافه کنید."` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/seo/RichTextField.tsx` | 60 | متن UI / توضیح کد | `<code>[باقلوا گردویی](/products/baklava-gerdouyi)</code> ⇒ لینک` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/seo/SeoSection.tsx` | 31 | متن UI / توضیح کد | `/** مسیر صفحه، مثل '/products/baklava-gerdouyi' */` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/seo/SeoSection.tsx` | 106 | متن UI / توضیح کد | `hint="با ویرگول جدا کنید؛ مثلاً: قیمت باقلوا، باقلوا تازه"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/seo/SerpPreview.tsx` | 7 | متن UI / توضیح کد | `/** «https://alihan.ir/products/x» ⇒ «alihan.ir › products › x» */` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/admin/settings/SeoSettingsForm.tsx` | 131 | متن UI / توضیح کد | `hint: "در عنوان همه‌ی صفحات و schema می‌آید؛ یک املا (مثلاً «علی حان»).",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/Footer.tsx` | 109 | متن UI / توضیح کد | `© ۲۰۲۵ علی حان. تمامی حقوق محفوظ است.` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/HeroCarousel.tsx` | 47 | متن UI / توضیح کد | `* ('h1' از تنظیمات سئو، مثل «خرید باقلوای ترکی علی حان»). شعار بزرگ '<p>'` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/HomeSections.tsx` | 49 | متن UI / توضیح کد | `* «داستان علی حان». دکمه‌ی «ویدیو معرفی برند» طراحی ساخته نشده، چون هنوز` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/Logo.tsx` | 50 | متن UI / توضیح کد | `* لوگوی کامل برند (نوشته‌ی «علی حان» + کمان‌ها). 'size' همان مقیاس نشان قبلی` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/Logo.tsx` | 70 | متن UI / توضیح کد | `alt="علی حان"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/Logo.tsx` | 83 | متن UI / توضیح کد | `<Link href={href} className={classes} aria-label="علی حان — صفحه اصلی">` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/TrustBar.tsx` | 21 | متن UI / توضیح کد | `aria-label="مزیت‌های خرید از علی حان"` | به `SITE.name` / مثال خنثی وصل شد |
| `src/components/shop/cart/CartPageView.tsx` | 78 | متن UI / توضیح کد | `محصولات علی حان را ببینید و بسته‌ی مورد علاقه‌تان را انتخاب کنید.` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/banners.ts` | 44 | متن UI / توضیح کد | `label: "تصویر «داستان علی حان»",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/image/urls.ts` | 9 | متن UI / توضیح کد | `* 'baklava-gerdouyi-1-a3f9'. نامک غیرلاتین (قدیمی) ⇒ 'product'.` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/maintenance.ts` | 14 | نام فنی (کوکی/کلید) | `export const MAINTENANCE_PREVIEW_COOKIE = "alihan_maintenance_preview";` | مبتنی بر `SITE.slug` |
| `src/lib/notification-templates.test.ts` | 16 | تست | `orderNumber: "AL-14050701-0003",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/notification-templates.test.ts` | 40 | تست | `"AL-14050701-0003",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/notification-templates.test.ts` | 45 | تست | `"AL-14050701-0003",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/notification-templates.test.ts` | 51 | تست | `).toEqual(["1,250,000", "09121234567", "AL-14050701-0003"]);` | مطابق رفتار جدید اصلاح شد |
| `src/lib/notification-templates.test.ts` | 104 | تست | `"سفارش {0} به مبلغ {1} تومان ثبت شد. alihan.ir";` | مطابق رفتار جدید اصلاح شد |
| `src/lib/notification-templates.test.ts` | 143 | تست | `"مریم احمدی عزیز، سفارش AL-14050701-0003 به مبلغ 1,250,000 تومان در علی‌حان ثبت شد.",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/notification-templates.ts` | 69 | شماره سفارش | `orderNumber: { label: "شماره‌ی سفارش", sample: "AL-14050701-0001" },` | پیشوند از Setting |
| `src/lib/notification-templates.ts` | 113 | متن UI | `OTP: 'کد ورود شما به علی‌حان: {0}\nاین کد را در اختیار دیگران قرار ندهید.\n${SITE_HOST}',` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/notification-templates.ts` | 114 | متن UI | `ORDER_PLACED: '{0} عزیز، سفارش {1} به مبلغ {2} تومان در علی‌حان ثبت شد. لطفاً مبلغ را کارت‌به‌کارت کنید و ر…` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/notification-templates.ts` | 115 | متن UI | `PAYMENT_APPROVED: '{0} عزیز، پرداخت سفارش {1} تأیید شد و سفارش شما در حال آماده‌سازی است.\nعلی‌حان\n${SITE_…` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/notification-templates.ts` | 116 | متن UI | `PAYMENT_REJECTED: '{0} عزیز، رسید پرداخت سفارش {1} تأیید نشد. لطفاً از بخش سفارش‌های من رسید صحیح را بارگذا…` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/notification-templates.ts` | 117 | متن UI | `ORDER_SHIPPED: '{0} عزیز، سفارش {1} ارسال شد.\nکد رهگیری: {2}\nعلی‌حان\n${SITE_HOST}',` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/notification-templates.ts` | 118 | متن UI | `ORDER_CANCELED: '{0} عزیز، سفارش {1} لغو شد. اگر مبلغی پرداخت کرده بودید به کیف پول حساب شما برگشت داده شده…` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/order-number.ts` | 4 | شماره سفارش | `* شماره‌ی سفارش خوانا: 'AL-{تاریخ شمسی تهران}-{ردیف روز}'، مثل` | پیشوند از Setting |
| `src/lib/order-number.ts` | 5 | شماره سفارش | `* 'AL-14040625-0031'. ردیف هر روز از ۱ شروع می‌شود و حداقل ۴ رقم دارد.` | پیشوند از Setting |
| `src/lib/order-number.ts` | 8 | شماره سفارش | `export const ORDER_NUMBER_PATTERN = /^AL-\d{8}-\d{4,}$/;` | پیشوند از Setting |
| `src/lib/order-number.ts` | 10 | شماره سفارش | `/** 'AL-14040625-' برای روزِ 'date' به وقت تهران */` | پیشوند از Setting |
| `src/lib/order-number.ts` | 12 | شماره سفارش | `return 'AL-${formatJalali(date, "YYYYMMDD", { digits: "en" })}-';` | پیشوند از Setting |
| `src/lib/order-status.test.ts` | 64 | تست | `"AL-14040701-0031",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/order-status.test.ts` | 66 | تست | `expect(orderNumberPrefix("2025-09-22T20:29:00Z")).toBe("AL-14040631-");` | مطابق رفتار جدید اصلاح شد |
| `src/lib/order-status.test.ts` | 68 | تست | `"AL-14040701-12345",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/rich-text.ts` | 9 | متن UI / توضیح کد | `* - '[متن](/products/baklava-gerdouyi)' ⇒ لینک (داخلی با '/'، خارجی با https)` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/analyze.ts` | 257 | متن UI / توضیح کد | `message: "متن لینک داخلی ندارد؛ مثلاً [باقلوا](/category/baklava).",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/audit.test.ts` | 81 | تست | `'<h1>a</h1><img src="/x.webp"/><p>{{تکمیل توسط علی حان: ساعات}}</p>',` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/audit.test.ts` | 89 | تست | `"error: 1 متن «{{تکمیل توسط علی حان…}}» هنوز جایگزین نشده",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/audit.ts` | 145 | متن UI / توضیح کد | `error('${placeholders} متن «{{تکمیل توسط علی حان…}}» هنوز جایگزین نشده');` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/jsonld.test.ts` | 4 | تست | `bakeryJsonLd,` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.test.ts` | 92 | تست | `legalName: "{{تکمیل توسط علی حان: نام حقوقی}}",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.test.ts` | 150 | تست | `{ question: "س۱", answer: "{{تکمیل توسط علی حان}}" },` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.test.ts` | 165 | تست | `faqPageJsonLd([{ question: "س", answer: "{{تکمیل توسط علی حان}}" }]),` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.test.ts` | 170 | تست | `describe("bakeryJsonLd", () => {` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.test.ts` | 187 | تست | `const data = bakeryJsonLd(base);` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.test.ts` | 189 | تست | `"@type": "Bakery",` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.test.ts` | 201 | تست | `expect(bakeryJsonLd({ ...base, latitude: null }).geo).toBeUndefined();` | مطابق رفتار جدید اصلاح شد |
| `src/lib/seo/jsonld.ts` | 21 | متن UI / توضیح کد | `/** مقدارهای جای‌نگهدار «{{تکمیل توسط علی حان…}}» هرگز وارد schema نمی‌شوند */` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/jsonld.ts` | 218 | schema.org | `export interface BakeryInput {` | LocalBusiness |
| `src/lib/seo/jsonld.ts` | 235 | schema.org | `/** شعبه: 'Bakery' (زیرنوع LocalBusiness) با آدرس، تلفن، ساعات و مختصات */` | LocalBusiness |
| `src/lib/seo/jsonld.ts` | 236 | schema.org | `export function bakeryJsonLd(input: BakeryInput): JsonObject {` | LocalBusiness |
| `src/lib/seo/jsonld.ts` | 240 | schema.org | `"@type": "Bakery",` | LocalBusiness |
| `src/lib/seo/keywords.ts` | 4 | متن UI / توضیح کد | `/** برای پیام: «محصول باقلوا گردویی» */` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 4 | متن UI / توضیح کد | `* - 'seo.brandName' تنها منبع نام برند است («علی حان» با فاصله)؛ املاهای دیگر` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 34 | متن UI | `export const DEFAULT_BRAND_NAME = "علی حان";` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 37 | متن UI / توضیح کد | `export const COMPLETION_MARKER = "{{تکمیل توسط علی حان";` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 47 | متن UI / توضیح کد | `/** '"%s \| {brandName}"' ⇒ '"%s \| علی حان"' (قالب title در Next.js) */` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 53 | متن UI / توضیح کد | `"خرید آنلاین باقلوای ترکی علی حان؛ باقلوا گردویی، پسته‌ای، هاویج، کادایف و شکلات دبی با مواد اولیه‌ی درجه‌ی…` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 57 | متن UI / توضیح کد | `"## باقلوای ترکی علی حان؛ طعم اصیل، تازه و دست‌ساز",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 58 | متن UI / توضیح کد | `'باقلوای ترکی با لایه‌های نازک و ترد خمیر یوفکا، مغز پرملات و شربتی که نه زیاد شیرین است و نه کم، یکی از مح…` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 59 | متن UI / توضیح کد | `"## خرید آنلاین باقلوا از علی حان",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 72 | متن UI / توضیح کد | `'باقلواهای علی حان در بسته‌بندی‌های شیک و مناسب هدیه آماده می‌شوند. ${todo("مناطق تحت پوشش ارسال، روش‌ها و …` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 107 | متن UI / توضیح کد | `[SEO_KEYS.alternateNames]: ["علیحان", "علی‌حان", "Alihan", "ALIHAN"],` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 112 | متن UI / توضیح کد | `[SEO_KEYS.homeTitle]: "خرید باقلوای ترکی اصل و تازه \| علی حان",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/settings.ts` | 114 | متن UI / توضیح کد | `[SEO_KEYS.homeH1]: "خرید باقلوای ترکی علی حان",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/seo/text.ts` | 29 | متن UI / توضیح کد | `* بنابراین «باقلوا پسته ای» و «باقلوا پسته‌ای» برابرند.` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/service-area.ts` | 2 | متن UI / توضیح کد | `* مناطق تحت پوشش ارسال. باقلوا شرایط نگهداری و ارسال خاصی دارد و فعلاً فقط` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 3 | متن UI / توضیح کد | `* (design_handoff_alihan_store/README.md).` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 14 | متن UI / توضیح کد | `name: "علی حان",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 17 | متن UI / توضیح کد | `"فروشگاه آنلاین باقلوا و شیرینی علی حان؛ باقلوای لوکس ترکی با بهترین مواد اولیه و بسته‌بندی مناسب هدیه.",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 25 | متن UI / توضیح کد | `email: "info@alihanbaklava.ir",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 70 | متن UI / توضیح کد | `text: "جعبه‌های کادویی علی حان، انتخابی شایسته برای پذیرایی، سوغات و هدیه به عزیزان.",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 84 | متن UI / توضیح کد | `title: "داستان علی حان",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 85 | متن UI / توضیح کد | `text: "علی حان حاصل سال‌ها تجربه در هنر باقلواسازی ترکیه و تلاش برای ارائه طعمی اصیل و متفاوت به دوستداران …` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 86 | متن UI / توضیح کد | `cta: { label: "داستان علی حان را بخوانید", href: "/about" },` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 99 | متن UI / توضیح کد | `eyebrow: "درباره علی حان",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/site-content.ts` | 104 | متن UI | `'علی حان کار خود را از سال ${SITE.establishedYear} با یک کارگاه کوچک و عشق به شیرینی‌های اصیل ترکی آغاز کرد…` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/slug.ts` | 12 | متن UI / توضیح کد | `* پیشنهاد نامک از متن لاتین («Baklava  Pistachio!» ⇒ 'baklava-pistachio').` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/validation/seo.ts` | 10 | متن UI / توضیح کد | `.min(1, "نامک (slug) را به انگلیسی وارد کنید؛ مثلاً baklava-gerdouyi")` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/validation/seo.ts` | 14 | متن UI / توضیح کد | `"نامک فقط حروف کوچک انگلیسی، عدد و خط تیره (-) باشد؛ مثلاً baklava-gerdouyi",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/lib/validation/seo.ts` | 77 | متن UI / توضیح کد | `/** «باقلوا، شیرینی ترکی, دسر» ⇒ آرایه (ویرگول فارسی/لاتین یا خط جدید) */` | به `SITE.name` / مثال خنثی وصل شد |
| `src/server/actions/product.ts` | 43 | متن UI / توضیح کد | `"مقصد ریدایرکت باید مسیری داخلی مثل /category/baklava باشد",` | به `SITE.name` / مثال خنثی وصل شد |
| `src/server/auth/cookie.ts` | 1 | نام فنی (کوکی/کلید) | `export const SESSION_COOKIE_NAME = "alihan_session";` | مبتنی بر `SITE.slug` |
| `src/server/crypto/secret-box.ts` | 21 | متن UI / توضیح کد | `.update('alihan-settings-secret:${getAuthSecret()}')` | به `SITE.name` / مثال خنثی وصل شد |
| `src/server/services/branch.service.ts` | 23 | schema.org | `* شعب (SEO.md §۶.۴ و فاز S4): صفحه‌ی '/branches/{slug}' با schema 'Bakery'.` | LocalBusiness |
| `src/server/services/seo-settings.service.ts` | 28 | متن UI / توضیح کد | `/** نام برند از 'seo.brandName'؛ خالی یا نامعتبر ⇒ «علی حان» */` | به `SITE.name` / مثال خنثی وصل شد |

## ب) موارد باقی‌مانده (فازهای بعد)

| فایل | خط | دسته | متن | فاز |
|---|---|---|---|---|
| `ARCHITECTURE.md` | 1 | سند | `# ARCHITECTURE.md — فروشگاه آنلاین علی‌حان (ALIHAN)` | F7 |
| `ARCHITECTURE.md` | 31 | سند | `جایگزینی سایت فعلی وردپرس/ووکامرس با یک وب‌اپ فروشگاهی سبک، سریع و کاملاً تحت کنترل، برای فروش آنلاین باقلو…` | F7 |
| `ARCHITECTURE.md` | 111 | سند | `alihan-shop/` | F7 |
| `ARCHITECTURE.md` | 299 | سند | `**Order** — 'id', 'orderNumber' (unique، خوانا مثل 'AL-14040625-0031'), 'userId', 'status', 'subtotal', 'sh…` | F7 |
| `ARCHITECTURE.md` | 432 | سند | `\| 'ORDER_PLACED' \| orderNumber, amount \| علی‌حان — سفارش {۱} به مبلغ {۲} تومان ثبت شد. لطفاً مبلغ را وار…` | F7 |
| `ARCHITECTURE.md` | 433 | سند | `\| 'PAYMENT_APPROVED' \| orderNumber \| علی‌حان — پرداخت سفارش {۱} تأیید شد و سفارش شما در حال آماده‌سازی ا…` | F7 |
| `ARCHITECTURE.md` | 434 | سند | `\| 'PAYMENT_REJECTED' \| orderNumber \| علی‌حان — رسید سفارش {۱} تأیید نشد. لطفاً به سایت مراجعه و رسید صحی…` | F7 |
| `ARCHITECTURE.md` | 435 | سند | `\| 'ORDER_SHIPPED' \| orderNumber, trackingCode \| علی‌حان — سفارش {۱} ارسال شد. کد رهگیری: {۲} \|` | F7 |
| `ARCHITECTURE.md` | 472 | سند | `NEXT_PUBLIC_SITE_URL=https://alihan.example` | F7 |
| `ARCHITECTURE.md` | 534 | سند | `- ۳ دسته‌بندی و ۸ محصول واقعی باقلوا — **حتماً شامل هر دو حالت 'GRAM' و 'PIECE'**` | F7 |
| `ARCHITECTURE.md` | 844 | سند | `\| ۱۴۰۵/۰۶/۳۰ \| پورت Postgres توسعه \| روی میزبان '127.0.0.1:5435' (نه ۵۴۳۲) تا با Postgres سایر پروژه‌های…` | F7 |
| `ARCHITECTURE.md` | 850 | سند | `\| ۱۴۰۵/۰۶/۳۰ \| slug در seed \| slugها فارسی و با خط تیره (مثل 'باقلوا-یزدی') تا با تولید خودکار slug در ف…` | F7 |
| `ARCHITECTURE.md` | 854 | سند | `\| ۱۴۰۵/۰۶/۳۰ \| ساختار Session \| JWT با 'jti' = شناسه‌ی رکورد 'Session'، 'sub' = userId، claim ‏'role'. '…` | F7 |
| `ARCHITECTURE.md` | 869 | سند | `\| ۱۴۰۵/۰۷/۰۱ \| طراحی UI \| مرجع ظاهر فروشگاه: پوشه‌ی 'design_handoff_alihan_store/' (تم تیره‌ی سبز، توکن‌…` | F7 |
| `ARCHITECTURE.md` | 898 | سند | `\| ۱۴۰۵/۰۷/۰۱ \| منطقه‌ی ارسال \| فعلاً **فقط استان تهران / شهر تهران** (شرایط نگهداری و ارسال باقلوا). فهر…` | F7 |
| `ARCHITECTURE.md` | 901 | سند | `\| ۱۴۰۵/۰۷/۰۱ \| شماره‌ی سفارش \| 'AL-{تاریخ شمسی تهران}-{ردیف روز، حداقل ۴ رقم}'. برای جلوگیری از شماره‌ی …` | F7 |
| `ARCHITECTURE.md` | 978 | سند | `\| ۱۴۰۵/۰۷/۰۵ \| سئو فاز S2: نام فایل تصویر محصول \| به‌جای uuid: 'products/{نامک}-{ردیف}-{۴ نویسه‌ی hex}.w…` | F7 |
| `ARCHITECTURE.md` | 985 | سند | `\| ۱۴۰۵/۰۷/۰۵ \| املای برند در متن سایت \| متن‌های قابل مشاهده‌ی سایت و پنل «علی حان» (با فاصله) شدند (SEO.…` | F7 |
| `ARCHITECTURE.md` | 989 | سند | `\| ۱۴۰۵/۰۷/۰۵ \| شعب در جدول Branch \| شعب از 'site.content' با migration داده‌ای به 'Branch' منتقل شدند (ن…` | F7 |
| `DEPLOYMENT.md` | 1 | سند | `# راهنمای استقرار علی‌حان (production)` | F7 |
| `DEPLOYMENT.md` | 34 | سند | `- اگر ساخت ایمیج روی سرور ممکن نیست، ایمیج‌ها ('alihan-app'، 'alihan-tools') را جای دیگری بسازید و با 'dock…` | F7 |
| `DEPLOYMENT.md` | 39 | سند | `git clone <مخزن> alihan && cd alihan` | F7 |
| `DEPLOYMENT.md` | 116 | سند | `*/10 * * * * cd /path/alihan && docker compose -f docker-compose.prod.yml --env-file .env.production run --…` | F7 |
| `DEPLOYMENT.md` | 117 | سند | `7 * * * *    cd /path/alihan && docker compose -f docker-compose.prod.yml --env-file .env.production run --…` | F7 |
| `DEPLOYMENT.md` | 118 | سند | `30 4 * * *   cd /path/alihan && docker compose -f docker-compose.prod.yml --env-file .env.production run --…` | F7 |
| `DEPLOYMENT.md` | 146 | سند | `rsync -az --delete user@server:/path/alihan/backups/ /mnt/alihan-backups/` | F7 |
| `DEPLOYMENT.md` | 232 | سند | `همه‌ی آدرس‌های sitemap را با User-Agent گوگل‌بات می‌خزد و گزارش می‌دهد: وضعیت HTTP، دقیقاً یک H1، عنوان/متا…` | F7 |
| `DEPLOYMENT.md` | 260 | سند | `- [ ] متن دسته‌ها و محصولات بازبینی شده (از جمله ۴ متن هاویج)` | F7 |
| `DEPLOYMENT.md` | 261 | سند | `- [ ] 'seo:audit' بدون خطای 🔴 (یعنی هیچ '{{تکمیل توسط علی حان}}' باقی نمانده)` | F7 |
| `README.md` | 1 | سند | `# فروشگاه آنلاین علی‌حان (ALIHAN)` | F7 |
| `README.md` | 3 | سند | `وب‌اپ فروشگاهی باقلوا و شیرینی — Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + PostgreSQL…` | F7 |
| `README.md` | 100 | سند | `- مرجع ظاهر: پوشه‌ی 'design_handoff_alihan_store/' (فایل HTML و اسکرین‌شات‌ها). توکن‌های رنگ و شعاع در 'src…` | F7 |
| `prisma/seed-catalog.ts` | 13 | seed | `* - ⚠️ متن ۴ محصول هاویج (دسته‌ی 'havij') و متن دسته‌ها پیش‌نویس Claude Code است و نیاز به` | F2 |
| `prisma/seed-catalog.ts` | 14 | seed | `*   بازبینی کارفرما دارد. '{{تکمیل توسط علی حان: …}}' عمداً باقی مانده است.` | F2 |
| `prisma/seed-catalog.ts` | 35 | seed | `name: "باقلوا گردویی",` | F2 |
| `prisma/seed-catalog.ts` | 36 | seed | `slug: "baklava-gerdouyi",` | F2 |
| `prisma/seed-catalog.ts` | 37 | seed | `categorySlug: "baklava",` | F2 |
| `prisma/seed-catalog.ts` | 39 | seed | `shortDescription: "باقلوای ترکی کلاسیک با مغز گردوی تازه و شربت متعادل",` | F2 |
| `prisma/seed-catalog.ts` | 41 | seed | `"باقلوا گردویی یکی از اصیل‌ترین و پرطرفدارترین انواع باقلوا است که با لایه‌های نازک و ترد خمیر یوفکا و مغز …` | F2 |
| `prisma/seed-catalog.ts` | 42 | seed | `"در تهیه این محصول از گردوی درجه‌یک و تازه استفاده می‌شود تا هر تکه باقلوا هم از نظر طعم و هم از نظر بافت، …` | F2 |
| `prisma/seed-catalog.ts` | 43 | seed | `"باقلوا گردویی گزینه‌ای عالی برای پذیرایی از مهمانان، هدیه دادن در مناسبت‌ها یا حتی لذت بردن از یک عصرانه ب…` | F2 |
| `prisma/seed-catalog.ts` | 45 | seed | `seoTitle: "خرید باقلوا گردویی اصل و تازه",` | F2 |
| `prisma/seed-catalog.ts` | 47 | seed | `"باقلوا گردویی علی حان با مغز گردوی تازه و شربت متعادل؛ طعمی اصیل و خوش‌عطر برای پذیرایی و هدیه. همین حالا …` | F2 |
| `prisma/seed-catalog.ts` | 48 | seed | `focusKeyword: "باقلوا گردویی",` | F2 |
| `prisma/seed-catalog.ts` | 51 | seed | `name: "باقلوا پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 52 | seed | `slug: "baklava-pesteei",` | F2 |
| `prisma/seed-catalog.ts` | 53 | seed | `categorySlug: "baklava",` | F2 |
| `prisma/seed-catalog.ts` | 55 | seed | `shortDescription: "باقلوای مجلسی با مغز پسته‌ی سبز و معطر",` | F2 |
| `prisma/seed-catalog.ts` | 57 | seed | `"باقلوا پسته‌ای با مغز پسته سبز و معطر، یکی از لوکس‌ترین و محبوب‌ترین انتخاب‌ها در میان انواع باقلواست. رنگ…` | F2 |
| `prisma/seed-catalog.ts` | 58 | seed | `"استفاده از پسته درجه‌یک و تازه، طعمی غنی و بویی دلپذیر به این باقلوا می‌بخشد. شربت به کار رفته با غلظت منا…` | F2 |
| `prisma/seed-catalog.ts` | 59 | seed | `"اگر به دنبال خرید باقلوا پسته‌ای اصل با کیفیت بالا برای مهمانی، عید یا هدیه هستید، این محصول با بسته‌بندی …` | F2 |
| `prisma/seed-catalog.ts` | 61 | seed | `seoTitle: "خرید باقلوا پسته‌ای اصل",` | F2 |
| `prisma/seed-catalog.ts` | 63 | seed | `"باقلوا پسته‌ای علی حان با مغز پسته‌ی درجه‌یک و رنگ سبز جذاب، انتخابی لوکس برای هدیه و مهمانی. سفارش آنلاین…` | F2 |
| `prisma/seed-catalog.ts` | 64 | seed | `focusKeyword: "باقلوا پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 67 | seed | `name: "باقلوا مخلوط",` | F2 |
| `prisma/seed-catalog.ts` | 68 | seed | `slug: "baklava-makhlut",` | F2 |
| `prisma/seed-catalog.ts` | 69 | seed | `categorySlug: "baklava",` | F2 |
| `prisma/seed-catalog.ts` | 71 | seed | `shortDescription: "باقلوای گردویی و پسته‌ای در یک جعبه",` | F2 |
| `prisma/seed-catalog.ts` | 73 | seed | `"باقلوا مخلوط بهترین گزینه برای کسانی است که نمی‌خواهند از تنوع طعم‌ها بگذرند. این جعبه ترکیبی از باقلوای گ…` | F2 |
| `prisma/seed-catalog.ts` | 74 | seed | `"این تنوع باعث می‌شود باقلوا مخلوط انتخابی هوشمندانه برای پذیرایی از جمع دوستان و خانواده با سلیقه‌های مختل…` | F2 |
| `prisma/seed-catalog.ts` | 75 | seed | `"باقلوا مخلوط همچنین گزینه محبوبی برای هدیه دادن در مناسبت‌های مختلف است، چرا که تنوع موجود در جعبه، آن را …` | F2 |
| `prisma/seed-catalog.ts` | 77 | seed | `seoTitle: "خرید باقلوا مخلوط گردویی و پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 79 | seed | `"جعبه‌ی باقلوا مخلوط علی حان با طعم‌های گردویی و پسته‌ای در یک بسته‌بندی شیک؛ مناسب پذیرایی و هدیه برای سلی…` | F2 |
| `prisma/seed-catalog.ts` | 80 | seed | `focusKeyword: "باقلوا مخلوط",` | F2 |
| `prisma/seed-catalog.ts` | 83 | seed | `name: "کادایف پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 85 | seed | `categorySlug: "baklava",` | F2 |
| `prisma/seed-catalog.ts` | 87 | seed | `shortDescription: "رشته‌های طلایی و ترد کادایف دور مغز پسته",` | F2 |
| `prisma/seed-catalog.ts` | 89 | seed | `"کادایف پسته‌ای با رشته‌های باریک و طلایی خمیر که دور مغز پسته پیچیده شده، یکی از خاص‌ترین شیرینی‌های ترکی …` | F2 |
| `prisma/seed-catalog.ts` | 90 | seed | `"پخت دقیق رشته‌های کادایف تا رسیدن به رنگ طلایی و ترد شدن کامل، از مهم‌ترین مراحل تولید این محصول است که مس…` | F2 |
| `prisma/seed-catalog.ts` | 91 | seed | `"کادایف پسته‌ای برای افرادی که به دنبال شیرینی‌های خاص و کمتر رایج با ظاهری متفاوت هستند، انتخابی درخشان اس…` | F2 |
| `prisma/seed-catalog.ts` | 93 | seed | `seoTitle: "خرید کادایف پسته‌ای اصل",` | F2 |
| `prisma/seed-catalog.ts` | 95 | seed | `"کادایف پسته‌ای علی حان با رشته‌های طلایی و ترد دور مغز پسته؛ شیرینی خاص ترکی برای تجربه‌ای تازه از طعم و ب…` | F2 |
| `prisma/seed-catalog.ts` | 96 | seed | `focusKeyword: "کادایف پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 99 | seed | `name: "هاویج گردویی",` | F2 |
| `prisma/seed-catalog.ts` | 100 | seed | `slug: "havij-gerdouyi",` | F2 |
| `prisma/seed-catalog.ts` | 101 | seed | `categorySlug: "havij",` | F2 |
| `prisma/seed-catalog.ts` | 103 | seed | `shortDescription: "برش‌های لوزی باقلوا با مغز گردو و شربت خوش‌طعم",` | F2 |
| `prisma/seed-catalog.ts` | 105 | seed | `"هاویج گردویی یکی از انواع باقلوای ترکی است که با برش‌های لوزی‌شکل مشخصه‌اش از دیگر شیرینی‌های سینی باقلوا …` | F2 |
| `prisma/seed-catalog.ts` | 106 | seed | `"طعم کمی گس و آشنای گردو، شیرینی شربت را متعادل می‌کند؛ به همین دلیل هاویج گردویی برای کسانی که باقلوای کلا…` | F2 |
| `prisma/seed-catalog.ts` | 107 | seed | `"اگر هاویج را همراه با سرشیر تازه می‌خواهید، [هاویج گردویی با سرشیر](/products/havij-gerdouyi-sarshir) را ب…` | F2 |
| `prisma/seed-catalog.ts` | 109 | seed | `seoTitle: "خرید هاویج گردویی",` | F2 |
| `prisma/seed-catalog.ts` | 111 | seed | `"هاویج گردویی علی حان؛ برش‌های لوزی باقلوای ترکی با مغز گردوی خردشده و شربت متعادل، کنار چای یا قهوه. همین …` | F2 |
| `prisma/seed-catalog.ts` | 112 | seed | `focusKeyword: "هاویج گردویی",` | F2 |
| `prisma/seed-catalog.ts` | 115 | seed | `name: "هاویج پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 116 | seed | `slug: "havij-pesteei",` | F2 |
| `prisma/seed-catalog.ts` | 117 | seed | `categorySlug: "havij",` | F2 |
| `prisma/seed-catalog.ts` | 119 | seed | `shortDescription: "هاویج مجلسی با مغز پسته و لایه‌های طلایی خمیر",` | F2 |
| `prisma/seed-catalog.ts` | 121 | seed | `"هاویج پسته‌ای نسخه‌ی مجلسی‌تر شیرینی هاویج است؛ همان برش‌های لوزی و لایه‌های نازک خمیر، این بار با مغز پست…` | F2 |
| `prisma/seed-catalog.ts` | 122 | seed | `"عطر پسته و شربتی که میان لایه‌ها نشسته، طعمی غنی‌تر و لطیف‌تر از نوع گردویی می‌سازد. هاویج پسته‌ای برای سی…` | F2 |
| `prisma/seed-catalog.ts` | 123 | seed | `"برای تجربه‌ای خامه‌ای‌تر، [هاویج پسته‌ای با سرشیر](/products/havij-pesteei-sarshir) را امتحان کنید که همین…` | F2 |
| `prisma/seed-catalog.ts` | 125 | seed | `seoTitle: "خرید هاویج پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 127 | seed | `"هاویج پسته‌ای علی حان با مغز پسته و لایه‌های طلایی خمیر در برش‌های لوزی؛ شیرینی ترکی مجلسی برای پذیرایی و …` | F2 |
| `prisma/seed-catalog.ts` | 128 | seed | `focusKeyword: "هاویج پسته‌ای",` | F2 |
| `prisma/seed-catalog.ts` | 131 | seed | `name: "هاویج گردویی با سرشیر",` | F2 |
| `prisma/seed-catalog.ts` | 132 | seed | `slug: "havij-gerdouyi-sarshir",` | F2 |
| `prisma/seed-catalog.ts` | 133 | seed | `categorySlug: "havij",` | F2 |
| `prisma/seed-catalog.ts` | 135 | seed | `shortDescription: "هاویج گردویی همراه با سرشیر (کیمک) تازه",` | F2 |
| `prisma/seed-catalog.ts` | 137 | seed | `"هاویج گردویی با سرشیر همان هاویج گردویی آشناست که با سرشیر (کیمک) تازه همراه شده است. سرشیر خامه‌ای و کم‌ش…` | F2 |
| `prisma/seed-catalog.ts` | 138 | seed | `"در سنت شیرینی‌های ترکی، سرو باقلوا با کیمک رایج است؛ چربی ملایم سرشیر تندی شیرینی شربت را می‌گیرد و طعم گر…` | F2 |
| `prisma/seed-catalog.ts` | 139 | seed | `'سرشیر محصولی لبنی و تازه است؛ پس از دریافت آن را در یخچال نگه دارید. ${todo("مدت ماندگاری سرشیر و نحوه‌ی ب…` | F2 |
| `prisma/seed-catalog.ts` | 141 | seed | `seoTitle: "خرید هاویج گردویی با سرشیر تازه",` | F2 |
| `prisma/seed-catalog.ts` | 143 | seed | `"هاویج گردویی علی حان با سرشیر تازه؛ برش‌های ترد باقلوا با مغز گردو کنار کیمک خامه‌ای، ترکیبی اصیل ترکی برا…` | F2 |
| `prisma/seed-catalog.ts` | 144 | seed | `focusKeyword: "هاویج گردویی با سرشیر",` | F2 |
| `prisma/seed-catalog.ts` | 147 | seed | `name: "هاویج پسته‌ای با سرشیر",` | F2 |
| `prisma/seed-catalog.ts` | 148 | seed | `slug: "havij-pesteei-sarshir",` | F2 |
| `prisma/seed-catalog.ts` | 149 | seed | `categorySlug: "havij",` | F2 |
| `prisma/seed-catalog.ts` | 151 | seed | `shortDescription: "هاویج پسته‌ای همراه با سرشیر (کیمک) تازه",` | F2 |
| `prisma/seed-catalog.ts` | 153 | seed | `"هاویج پسته‌ای با سرشیر ترکیبی از دو طعم شاخص شیرینی ترکی است: برش‌های لوزی هاویج با مغز پسته، و سرشیر (کیم…` | F2 |
| `prisma/seed-catalog.ts` | 155 | seed | `'سرشیر را تا زمان سرو در یخچال نگه دارید. ${todo("مدت ماندگاری سرشیر و نحوه‌ی بسته‌بندی آن کنار هاویج")}',` | F2 |
| `prisma/seed-catalog.ts` | 157 | seed | `seoTitle: "خرید هاویج پسته‌ای با سرشیر تازه",` | F2 |
| `prisma/seed-catalog.ts` | 159 | seed | `"هاویج پسته‌ای علی حان با سرشیر تازه؛ عطر پسته و لایه‌های ترد خمیر کنار کیمک خامه‌ای، دسری مجلسی برای مهمان…` | F2 |
| `prisma/seed-catalog.ts` | 160 | seed | `focusKeyword: "هاویج پسته‌ای با سرشیر",` | F2 |
| `prisma/seed-catalog.ts` | 163 | seed | `name: "سوتلاوا",` | F2 |
| `prisma/seed-catalog.ts` | 167 | seed | `shortDescription: "باقلوای سرد ترکی با شربت شیری، ملایم و خنک",` | F2 |
| `prisma/seed-catalog.ts` | 169 | seed | `"سوتلاوا یا همان «باقلوای سرد» یکی از دسرهای خاص و اصیل ترکی است که برخلاف باقلوای سنتی، به جای شربت غلیظ ش…` | F2 |
| `prisma/seed-catalog.ts` | 171 | seed | `"سوتلاوا انتخابی متفاوت و به‌یادماندنی برای کسانی است که به دنبال طعم و بافتی تازه در دنیای شیرینی‌های شرقی…` | F2 |
| `prisma/seed-catalog.ts` | 173 | seed | `seoTitle: "خرید سوتلاوا (باقلوای سرد ترکی)",` | F2 |
| `prisma/seed-catalog.ts` | 175 | seed | `"سوتلاوا علی حان، باقلوای سرد ترکی با شربت شیری و طعمی ملایم و خنک؛ دسری متفاوت برای علاقه‌مندان به شیرینی‌…` | F2 |
| `prisma/seed-catalog.ts` | 176 | seed | `focusKeyword: "سوتلاوا",` | F2 |
| `prisma/seed-catalog.ts` | 179 | seed | `name: "کنافه پنیری",` | F2 |
| `prisma/seed-catalog.ts` | 183 | seed | `shortDescription: "رشته‌های ترد کنافه با پنیر کشدار و شربت معطر",` | F2 |
| `prisma/seed-catalog.ts` | 185 | seed | `"کنافه پنیری یکی از محبوب‌ترین دسرهای گرم شرقی است که از رشته‌های نازک خمیر کنافه، پنیر کشی مخصوص و شربت مع…` | F2 |
| `prisma/seed-catalog.ts` | 186 | seed | `"سرو گرم کنافه، بهترین حالت برای لذت بردن از کشش پنیر و عطر شربت است؛ به همین دلیل این محصول معمولاً تازه ت…` | F2 |
| `prisma/seed-catalog.ts` | 187 | seed | `"کنافه پنیری انتخابی عالی برای مهمانی‌های شرقی، جشن‌ها و مناسبت‌های خاص است و می‌تواند به عنوان دسری متفاوت…` | F2 |
| `prisma/seed-catalog.ts` | 189 | seed | `seoTitle: "خرید کنافه پنیری گرم و تازه",` | F2 |
| `prisma/seed-catalog.ts` | 191 | seed | `"کنافه پنیری علی حان با رشته‌های ترد و پنیر کشدار داغ؛ دسری اصیل شرقی برای مهمانی‌ها و مناسبت‌های خاص. همین…` | F2 |
| `prisma/seed-catalog.ts` | 192 | seed | `focusKeyword: "کنافه پنیری",` | F2 |
| `prisma/seed-catalog.ts` | 201 | seed | `"بامیه ترکی یکی از دسرهای گرم و محبوب سنتی است که از خمیری نرم، سرخ‌شده تا رسیدن به رنگ طلایی و بافتی ترد د…` | F2 |
| `prisma/seed-catalog.ts` | 207 | seed | `"بامیه ترکی علی حان؛ دسری سرخ‌شده و آغشته به شربت با بافتی ترد بیرون و نرم داخل. طعمی اصیل برای پذیرایی روز…` | F2 |
| `prisma/seed-catalog.ts` | 211 | seed | `name: "شکلات دبی",` | F2 |
| `prisma/seed-catalog.ts` | 215 | seed | `shortDescription: "شکلات با مغز کرم پسته و رشته‌های ترد کنافه",` | F2 |
| `prisma/seed-catalog.ts` | 217 | seed | `"شکلات دبی همان دسر پرطرفدار و پدیده‌ی این روزهای شبکه‌های اجتماعی است که ترکیبی از شکلات مرغوب، کرم پسته و…` | F2 |
| `prisma/seed-catalog.ts` | 218 | seed | `"استفاده از کرم پسته اصل و رشته‌های کنافه به‌خوبی برشته‌شده، طعمی غنی و بافتی چندلایه به شکلات دبی می‌بخشد …` | F2 |
| `prisma/seed-catalog.ts` | 219 | seed | `"شکلات دبی به دلیل ظاهر خاص و طعم منحصربه‌فردش، انتخابی عالی برای هدیه دادن، پذیرایی از مهمانان یا حتی لوس …` | F2 |
| `prisma/seed-catalog.ts` | 221 | seed | `seoTitle: "خرید شکلات دبی با کرم پسته و کنافه",` | F2 |
| `prisma/seed-catalog.ts` | 223 | seed | `"شکلات دبی علی حان با کرم پسته و رشته‌های ترد کنافه؛ پدیده‌ی این روزهای دنیای شیرینی. همین حالا سفارش دهید …` | F2 |
| `prisma/seed-catalog.ts` | 224 | seed | `focusKeyword: "شکلات دبی",` | F2 |
| `prisma/seed-catalog.ts` | 233 | seed | `"باقلوا-یزدی",` | F2 |
| `prisma/seed-catalog.ts` | 234 | seed | `"باقلوا-ترکی",` | F2 |
| `prisma/seed-catalog.ts` | 235 | seed | `"باقلوا-لوزی",` | F2 |
| `prisma/seed-catalog.ts` | 239 | seed | `"جعبه-ی-هدیه-ی-باقلوا",` | F2 |
| `prisma/seed-catalog.ts` | 243 | seed | `"باقلوا",` | F2 |
| `prisma/seed-catalog.ts` | 244 | seed | `"شیرینی-سنتی",` | F2 |
| `prisma/seed-categories.ts` | 27 | seed | `name: "باقلوا",` | F2 |
| `prisma/seed-categories.ts` | 28 | seed | `slug: "baklava",` | F2 |
| `prisma/seed-categories.ts` | 30 | seed | `description: "باقلوای ترکی گردویی، پسته‌ای و مخلوط، کادایف و شیرینی هاویج",` | F2 |
| `prisma/seed-categories.ts` | 31 | seed | `seoTitle: "انواع باقلوای ترکی؛ گردویی، پسته‌ای و مخلوط",` | F2 |
| `prisma/seed-categories.ts` | 33 | seed | `"انواع باقلوای ترکی علی حان را ببینید و مقایسه کنید؛ گردویی، پسته‌ای، مخلوط، کادایف و هاویج با قیمت و وزن‌ه…` | F2 |
| `prisma/seed-categories.ts` | 34 | seed | `focusKeyword: "انواع باقلوا",` | F2 |
| `prisma/seed-categories.ts` | 35 | seed | `secondaryKeywords: ["قیمت باقلوا", "باقلوا گردویی و پسته‌ای"],` | F2 |
| `prisma/seed-categories.ts` | 37 | seed | `"باقلوای ترکی با لایه‌های نازک و ترد خمیر یوفکا، مغز گردو یا پسته و شربتی متعادل، از محبوب‌ترین شیرینی‌های …` | F2 |
| `prisma/seed-categories.ts` | 39 | seed | `"## انواع باقلوا؛ کدام را انتخاب کنیم؟",` | F2 |
| `prisma/seed-categories.ts` | 40 | seed | `"[باقلوا گردویی](/products/baklava-gerdouyi) کلاسیک‌ترین نوع باقلواست؛ طعم کمی گس گردو شیرینی شربت را متعاد…` | F2 |
| `prisma/seed-categories.ts` | 41 | seed | `"[کادایف پسته‌ای](/products/kadayif-pesteei) به‌جای لایه‌های صاف خمیر، رشته‌های باریک و طلایی دارد که دور م…` | F2 |
| `prisma/seed-categories.ts` | 42 | seed | `"## خرید آنلاین باقلوا از علی حان",` | F2 |
| `prisma/seed-categories.ts` | 43 | seed | `"برای خرید باقلوا کافی است نوع و وزن دلخواه را انتخاب کنید و سفارش را ثبت کنید. قیمت هر وزن در صفحه‌ی همان …` | F2 |
| `prisma/seed-categories.ts` | 44 | seed | `'باقلوا را در جای خشک و خنک و دور از نور مستقیم نگه دارید تا تردی لایه‌هایش حفظ شود. ${todo("مدت ماندگاری ب…` | F2 |
| `prisma/seed-categories.ts` | 50 | seed | `name: "هاویج",` | F2 |
| `prisma/seed-categories.ts` | 51 | seed | `slug: "havij",` | F2 |
| `prisma/seed-categories.ts` | 52 | seed | `parentSlug: "baklava",` | F2 |
| `prisma/seed-categories.ts` | 53 | seed | `description: "شیرینی هاویج گردویی و پسته‌ای، با یا بدون سرشیر تازه",` | F2 |
| `prisma/seed-categories.ts` | 54 | seed | `seoTitle: "خرید شیرینی هاویج گردویی و پسته‌ای",` | F2 |
| `prisma/seed-categories.ts` | 56 | seed | `"شیرینی هاویج علی حان در دو طعم گردویی و پسته‌ای، با یا بدون سرشیر تازه. برش‌های لوزی با شربت خوش‌طعم، مناس…` | F2 |
| `prisma/seed-categories.ts` | 57 | seed | `focusKeyword: "شیرینی هاویج",` | F2 |
| `prisma/seed-categories.ts` | 58 | seed | `secondaryKeywords: ["خرید هاویج", "هاویج با سرشیر"],` | F2 |
| `prisma/seed-categories.ts` | 60 | seed | `"شیرینی هاویج یکی از انواع باقلوای ترکی است که با برش‌های لوزی‌شکل مشخصه‌اش شناخته می‌شود و در دو طعم گردوی…` | F2 |
| `prisma/seed-categories.ts` | 61 | seed | `// متن هاویج از docs/product-details.md (طبق SEO.md §۲.۳ روی همین دسته)` | F2 |
| `prisma/seed-categories.ts` | 63 | seed | `"## شیرینی هاویج چیست؟",` | F2 |
| `prisma/seed-categories.ts` | 64 | seed | `"شیرینی هاویج با برش‌های لوزی شکل مشخصه‌اش، یکی دیگر از انواع محبوب باقلواست که در دو نوع گردویی و پسته‌ای …` | F2 |
| `prisma/seed-categories.ts` | 65 | seed | `"آنچه هاویج را خاص‌تر می‌کند، امکان سفارش آن به همراه سرشیر (کیمک) تازه است؛ ترکیب سرشیر خامه‌ای و لطیف با …` | F2 |
| `prisma/seed-categories.ts` | 66 | seed | `"## هاویج گردویی یا پسته‌ای؛ با سرشیر یا بدون آن؟",` | F2 |
| `prisma/seed-categories.ts` | 67 | seed | `"با چهار حالت انتخابی (گردویی یا پسته‌ای، با یا بدون سرشیر)، هاویج گزینه‌ای منعطف برای سلیقه‌های مختلف است …` | F2 |
| `prisma/seed-categories.ts` | 68 | seed | `"نوع گردویی طعمی کلاسیک‌تر و کمی گس دارد و نوع پسته‌ای عطر و رنگی مجلسی‌تر؛ سرشیر هم برای کسانی مناسب است ک…` | F2 |
| `prisma/seed-categories.ts` | 70 | seed | `"- [هاویج گردویی](/products/havij-gerdouyi)؛ طعم کلاسیک و آشنای گردو",` | F2 |
| `prisma/seed-categories.ts` | 71 | seed | `"- [هاویج پسته‌ای](/products/havij-pesteei)؛ مجلسی با عطر پسته",` | F2 |
| `prisma/seed-categories.ts` | 72 | seed | `"- [هاویج گردویی با سرشیر](/products/havij-gerdouyi-sarshir)؛ گردو در کنار کیمک خامه‌ای",` | F2 |
| `prisma/seed-categories.ts` | 73 | seed | `"- [هاویج پسته‌ای با سرشیر](/products/havij-pesteei-sarshir)؛ ترکیب پسته و سرشیر برای پذیرایی ویژه",` | F2 |
| `prisma/seed-categories.ts` | 83 | seed | `description: "سوتلاوا، کنافه پنیری و بامیه ترکی",` | F2 |
| `prisma/seed-categories.ts` | 84 | seed | `seoTitle: "خرید شیرینی و دسر ترکی؛ سوتلاوا، کنافه و بامیه",` | F2 |
| `prisma/seed-categories.ts` | 86 | seed | `"دسرهای اصیل ترکی علی حان: سوتلاوای خنک، کنافه‌ی پنیری و بامیه‌ی ترکی تازه. سفارش آنلاین با بسته‌بندی مناسب.",` | F2 |
| `prisma/seed-categories.ts` | 87 | seed | `focusKeyword: "شیرینی ترکی",` | F2 |
| `prisma/seed-categories.ts` | 88 | seed | `secondaryKeywords: ["دسر ترکی", "خرید شیرینی ترکی"],` | F2 |
| `prisma/seed-categories.ts` | 90 | seed | `"دسرهای ترکی علی حان فراتر از باقلوای کلاسیک‌اند: سوتلاوای خنک با شربت شیری، کنافه‌ی پنیری با رشته‌های ترد …` | F2 |
| `prisma/seed-categories.ts` | 92 | seed | `"## سوتلاوا، کنافه و بامیه؛ سه دسر، سه تجربه",` | F2 |
| `prisma/seed-categories.ts` | 93 | seed | `"[سوتلاوا](/products/sutlava) که به آن باقلوای سرد هم می‌گویند، به‌جای شربت غلیظ شکر با شربت شیری تهیه و سر…` | F2 |
| `prisma/seed-categories.ts` | 94 | seed | `"[کنافه پنیری](/products/kanafeh-panir) دسری گرم است: رشته‌های طلایی و ترد کنافه، پنیر کشدار را در بر گرفته…` | F2 |
| `prisma/seed-categories.ts` | 97 | seed | `"اگر دسری خنک و کم‌شیرین می‌خواهید سوتلاوا، برای پذیرایی گرم و متفاوت کنافه‌ی پنیری، و برای عصرانه‌ای ساده …` | F2 |
| `prisma/seed-categories.ts` | 98 | seed | `'${todo("شرایط ارسال کنافه‌ی گرم و سوتلاوای سرد (زمان، بسته‌بندی و محدوده‌ی ارسال)")}',` | F2 |
| `prisma/seed-categories.ts` | 107 | seed | `description: "شکلات‌های علی حان با الهام از شیرینی‌های شرقی",` | F2 |
| `prisma/seed-categories.ts` | 110 | seed | `// بدون کلمه‌ی کانونی: رقیب صفحه‌ی «شکلات دبی» نشود (SEO.md §۲.۱)` | F2 |
| `prisma/seed-categories.ts` | 114 | seed | `"در این دسته شکلات‌های علی حان را می‌بینید که با الهام از طعم‌های شرقی تهیه شده‌اند؛ ترکیب شکلات مرغوب با م…` | F2 |
| `prisma/seed-categories.ts` | 117 | seed | `"ترکیب شکلات با پسته و کنافه، دو عنصر آشنای شیرینی‌های شرقی را به دنیای شکلات آورده است. [شکلات دبی](/produ…` | F2 |
| `prisma/seed-categories.ts` | 118 | seed | `"کیفیت چنین شکلاتی به مواد اولیه‌اش بستگی دارد؛ کرم پسته‌ی خوش‌عطر و رشته‌های کنافه‌ای که به‌خوبی برشته شده…` | F2 |
| `prisma/seed-categories.ts` | 120 | seed | `"شکلات‌های این دسته به دلیل ظاهر خاص و طعم متفاوتشان، هدیه‌ای مناسب برای مناسبت‌ها و میزبانی از مهمانان هست…` | F2 |
| `prisma/seed-data.ts` | 31 | seed | `accountHolderName: "علی‌حان (نمونه — قبل از انتشار جایگزین شود)",` | F2 |
| `prisma/seed-data.ts` | 42 | seed | `name: "باقلوا",` | F2 |
| `prisma/seed-data.ts` | 44 | seed | `["باقلوای پسته‌ای", "پسته‌ی احمدآقایی، هر پرس ۴ عدد", 185_000],` | F2 |
| `prisma/seed-data.ts` | 45 | seed | `["باقلوای گردویی", "گردوی تازه و شربت سبک", 145_000],` | F2 |
| `prisma/seed-data.ts` | 47 | seed | `["باقلوای بستنی", "باقلوای گرم با بستنی وانیلی", 220_000],` | F2 |
| `prisma/seed-pages.ts` | 6 | seed | `* سایت نگه می‌دارد)؛ هر ادعای کسب‌وکار '{{تکمیل توسط علی حان: …}}' است.` | F2 |
| `prisma/seed-pages.ts` | 32 | seed | `'علی حان ${todo("سال شروع فعالیت و داستان شکل‌گیری برند")}',` | F2 |
| `prisma/seed-pages.ts` | 33 | seed | `'${todo("روش تولید، مواد اولیه و آنچه علی حان را متفاوت می‌کند")}',` | F2 |
| `prisma/seed-pages.ts` | 51 | seed | `seoTitle: "سوالات متداول خرید باقلوا",` | F2 |
| `prisma/seed-pages.ts` | 53 | seed | `"پاسخ پرسش‌های رایج درباره‌ی خرید آنلاین باقلوا از علی حان: روش پرداخت، ارسال با پیک، پیگیری سفارش و نگهدار…` | F2 |
| `prisma/seed-pages.ts` | 72 | seed | `question: "باقلوا را چطور نگهداری کنیم و تا چه مدت تازه می‌ماند؟",` | F2 |
| `prisma/seed-pages.ts` | 86 | seed | `"نحوه‌ی ارسال سفارش‌های علی حان: ارسال با پیک پس از تأیید پرداخت و پرداخت هزینه‌ی پیک درب منزل.",` | F2 |
| `prisma/seed-pages.ts` | 106 | seed | `'باقلوا و شیرینی کالای خوراکی و تازه است. ${todo("شرایط مرجوعی یا جایگزینی در صورت آسیب‌دیدگی یا مغایرت سفا…` | F2 |
| `src/app/(menu)/menu/[slug]/page.tsx` | 84 | متن UI صفحات ثابت | `خرید آنلاین باقلوای {SITE.name}` | F2 |
| `src/app/(shop)/about/page.tsx` | 30 | متن UI صفحات ثابت | `'داستان ${SITE.name}؛ هنر باقلواسازی ترکی، مواد اولیه‌ی درجه یک و بسته‌بندی شایسته‌ی هدیه.',` | F2 |
| `src/app/(shop)/branches/page.tsx` | 28 | متن UI صفحات ثابت | `باقلوای تازه را حضوری هم می‌توانید از شعب ما تهیه کنید.` | F2 |
| `src/app/(shop)/products/page.tsx` | 26 | متن UI صفحات ثابت | `description: 'خرید آنلاین انواع باقلوای ترکی، شیرینی هاویج، دسرهای ترکی و شکلات ${SITE.name}.',` | F2 |
| `src/app/(shop)/products/page.tsx` | 50 | متن UI صفحات ثابت | `subtitle="باقلوا، شیرینی هاویج، دسرهای ترکی و شکلات"` | F2 |
| `src/components/shop/HomeSeoContent.tsx` | 22 | متن UI صفحات ثابت | `aria-label="درباره‌ی خرید باقلوا از ما"` | F2 |
| `src/lib/catalog-url.test.ts` | 26 | تست داده‌ای | `expect(buildCatalogHref(empty, "/category/باقلوا")).toBe(` | F2 |
| `src/lib/catalog-url.test.ts` | 27 | تست داده‌ای | `"/category/باقلوا",` | F2 |
| `src/lib/catalog-url.test.ts` | 33 | تست داده‌ای | `categorySlugs: ["باقلوا", "قطاب"],` | F2 |
| `src/lib/catalog-url.test.ts` | 44 | تست داده‌ای | `expect(url.searchParams.get("category")).toBe("باقلوا,قطاب");` | F2 |
| `src/lib/coupon.test.ts` | 37 | تست داده‌ای | `{ productId: "p-baklava", categoryId: "c-baklava", lineTotal: 520_000 },` | F2 |
| `src/lib/coupon.test.ts` | 227 | تست داده‌ای | `const product = rule({ scope: "PRODUCT", productIds: ["p-baklava"] });` | F2 |
| `src/lib/image/image.test.ts` | 125 | تست داده‌ای | `const base = productImageBaseName("baklava-gerdouyi", 1, "a3f9");` | F2 |
| `src/lib/image/image.test.ts` | 126 | تست داده‌ای | `expect(base).toBe("baklava-gerdouyi-1-a3f9");` | F2 |
| `src/lib/image/image.test.ts` | 128 | تست داده‌ای | `main: "products/baklava-gerdouyi-1-a3f9.webp",` | F2 |
| `src/lib/image/image.test.ts` | 129 | تست داده‌ای | `thumb: "products/baklava-gerdouyi-1-a3f9-thumb.webp",` | F2 |
| `src/lib/image/image.test.ts` | 130 | تست داده‌ای | `og: "products/baklava-gerdouyi-1-a3f9-og.jpg",` | F2 |
| `src/lib/image/image.test.ts` | 135 | تست داده‌ای | `expect(productImageBaseName("سوتلاوا", 2, "00ff")).toBe("product-2-00ff");` | F2 |
| `src/lib/image/image.test.ts` | 155 | تست داده‌ای | `["products/baklava-gerdouyi-1-a3f9.webp", "image/webp"],` | F2 |
| `src/lib/image/image.test.ts` | 156 | تست داده‌ای | `["products/baklava-gerdouyi-1-a3f9-thumb.webp", "image/webp"],` | F2 |
| `src/lib/image/image.test.ts` | 157 | تست داده‌ای | `["products/baklava-gerdouyi-1-a3f9-og.jpg", "image/jpeg"],` | F2 |
| `src/lib/image/image.test.ts` | 167 | تست داده‌ای | `"products/Baklava-1-a3f9.webp",` | F2 |
| `src/lib/product-validation.test.ts` | 14 | تست داده‌ای | `name: "باقلوا یزدی",` | F2 |
| `src/lib/product-validation.test.ts` | 15 | تست داده‌ای | `slug: "baklava-yazdi",` | F2 |
| `src/lib/product-validation.test.ts` | 33 | تست داده‌ای | `slug: " Baklava-Yazdi ",` | F2 |
| `src/lib/product-validation.test.ts` | 38 | تست داده‌ای | `expect(parsed.slug).toBe("baklava-yazdi");` | F2 |
| `src/lib/product-validation.test.ts` | 119 | تست داده‌ای | `expect(issues({ ...validProduct, slug: "باقلوا" }).slug).toBeDefined();` | F2 |
| `src/lib/product-validation.test.ts` | 128 | تست داده‌ای | `secondaryKeywords: ["باقلوا", "باقلوا", " "],` | F2 |
| `src/lib/product-validation.test.ts` | 134 | تست داده‌ای | `secondaryKeywords: ["باقلوا"],` | F2 |
| `src/lib/product-validation.test.ts` | 162 | تست داده‌ای | `name: "باقلوا",` | F2 |
| `src/lib/product-validation.test.ts` | 163 | تست داده‌ای | `slug: "baklava",` | F2 |
| `src/lib/product-validation.test.ts` | 168 | تست داده‌ای | `name: "باقلوا",` | F2 |
| `src/lib/product-validation.test.ts` | 170 | تست داده‌ای | `slug: "baklava",` | F2 |
| `src/lib/rich-text.test.ts` | 55 | تست داده‌ای | `"ببینید [باقلوا](/category/baklava) و **تازه** [سایت](https://example.com)",` | F2 |
| `src/lib/rich-text.test.ts` | 61 | تست داده‌ای | `text: "باقلوا",` | F2 |
| `src/lib/rich-text.test.ts` | 62 | تست داده‌ای | `href: "/category/baklava",` | F2 |
| `src/lib/seo/analyze.test.ts` | 17 | تست داده‌ای | `name: "باقلوا گردویی",` | F2 |
| `src/lib/seo/analyze.test.ts` | 18 | تست داده‌ای | `seoTitle: "خرید باقلوا گردویی اصل و تازه",` | F2 |
| `src/lib/seo/analyze.test.ts` | 20 | تست داده‌ای | `"باقلوا گردویی علی حان با مغز گردوی تازه و شربت متعادل؛ طعمی اصیل و خوش‌عطر برای پذیرایی و هدیه. همین حالا …` | F2 |
| `src/lib/seo/analyze.test.ts` | 21 | تست داده‌ای | `focusKeyword: "باقلوا گردویی",` | F2 |
| `src/lib/seo/analyze.test.ts` | 22 | تست داده‌ای | `text: 'باقلوا گردویی ${words(260)} [باقلوا](/category/baklava)',` | F2 |
| `src/lib/seo/analyze.test.ts` | 23 | تست داده‌ای | `images: [{ alt: "باقلوا گردویی علی حان", isPrimary: true }],` | F2 |
| `src/lib/seo/analyze.test.ts` | 25 | تست داده‌ای | `titleSettings: { brandName: "علی حان", titleTemplate: "%s \| {brandName}" },` | F2 |
| `src/lib/seo/analyze.test.ts` | 46 | تست داده‌ای | `// «سوتلاوا \| علی حان» = ۱۷ کاراکتر` | F2 |
| `src/lib/seo/analyze.test.ts` | 47 | تست داده‌ای | `expect(status(base({ seoTitle: "سوتلاوا" }), "titleLength")).toBe("warn");` | F2 |
| `src/lib/seo/analyze.test.ts` | 54 | تست داده‌ای | `// «خرید باقلوا گردویی اصل و تازه \| علی حان» = ۳۹ کاراکتر` | F2 |
| `src/lib/seo/analyze.test.ts` | 69 | تست داده‌ای | `base({ seoTitle: "خرید شیرینی ترکی اصل و تازه" }),` | F2 |
| `src/lib/seo/analyze.test.ts` | 73 | تست داده‌ای | `expect(status(base({ name: "باقلوا" }), "keywordInH1")).toBe("warn");` | F2 |
| `src/lib/seo/analyze.test.ts` | 82 | تست داده‌ای | `base({ text: '${words(150)} باقلوا گردویی ${words(150)}' }),` | F2 |
| `src/lib/seo/analyze.test.ts` | 90 | تست داده‌ای | `name: "باقلوا پسته‌ای",` | F2 |
| `src/lib/seo/analyze.test.ts` | 91 | تست داده‌ای | `seoTitle: "خرید باقلوا پسته‌ای اصل",` | F2 |
| `src/lib/seo/analyze.test.ts` | 92 | تست داده‌ای | `focusKeyword: "باقلوا پسته اي",` | F2 |
| `src/lib/seo/analyze.test.ts` | 93 | تست داده‌ای | `metaDescription: 'باقلوا پسته‌ای ${"متن ".repeat(28)}',` | F2 |
| `src/lib/seo/analyze.test.ts` | 94 | تست داده‌ای | `text: 'باقلوا پسته‌ای ${words(260)} [x](/a)',` | F2 |
| `src/lib/seo/analyze.test.ts` | 120 | تست داده‌ای | `base({ text: 'باقلوا گردویی ${words(100)} [x](/a)' }),` | F2 |
| `src/lib/seo/analyze.test.ts` | 148 | تست داده‌ای | `{ alt: "باقلوا گردویی علی حان", isPrimary: true },` | F2 |
| `src/lib/seo/analyze.test.ts` | 149 | تست داده‌ای | `{ alt: "باقلوا گردویی علی حان ۲", isPrimary: false },` | F2 |
| `src/lib/seo/analyze.test.ts` | 159 | تست داده‌ای | `{ alt: "باقلوا گردویی روی سینی", isPrimary: true },` | F2 |
| `src/lib/seo/analyze.test.ts` | 160 | تست داده‌ای | `{ alt: "برش نزدیک باقلوا با مغز گردو", isPrimary: false },` | F2 |
| `src/lib/seo/analyze.test.ts` | 171 | تست داده‌ای | `base({ text: 'باقلوا گردویی ${words(260)} [x](https://a.com)' }),` | F2 |
| `src/lib/seo/analyze.test.ts` | 181 | تست داده‌ای | `focusKeyword: ["محصول «باقلوا گردویی ویژه»"],` | F2 |
| `src/lib/seo/analyze.test.ts` | 182 | تست داده‌ای | `seoTitle: ["دسته «باقلوا»"],` | F2 |
| `src/lib/seo/analyze.test.ts` | 189 | تست داده‌ای | `expect(keyword?.message).toContain("باقلوا گردویی ویژه");` | F2 |
| `src/lib/seo/analyze.test.ts` | 202 | تست داده‌ای | `const stuffed = '${"باقلوا گردویی ".repeat(10)}${words(280)} [x](/a)';` | F2 |
| `src/lib/seo/analyze.test.ts` | 204 | تست داده‌ای | `const natural = '${"باقلوا گردویی ".repeat(6)}${words(280)} [x](/a)';` | F2 |
| `src/lib/seo/analyze.test.ts` | 217 | تست داده‌ای | `const warn = summarizeSeo(analyzeSeo(base({ name: "باقلوا" })));` | F2 |
| `src/lib/seo/audit.test.ts` | 12 | تست داده‌ای | `const URL_ = "https://alihan.ir/products/baklava-gerdouyi";` | F2 |
| `src/lib/seo/audit.test.ts` | 16 | تست داده‌ای | `<title>خرید باقلوا گردویی \| علی حان</title>` | F2 |
| `src/lib/seo/audit.test.ts` | 17 | تست داده‌ای | `<meta name="description" content="باقلوا گردویی تازه"/>` | F2 |
| `src/lib/seo/audit.test.ts` | 33 | تست داده‌ای | `'<h1>باقلوا گردویی</h1><img src="/a.webp" alt="باقلوا"/><img src="/b" alt=""/>',` | F2 |
| `src/lib/seo/audit.test.ts` | 58 | تست داده‌ای | `"https://alihan.ir/products",` | F2 |
| `src/lib/seo/audit.test.ts` | 63 | تست داده‌ای | `"/products/baklava-gerdouyi",` | F2 |
| `src/lib/seo/audit.test.ts` | 152 | تست داده‌ای | `"https://a.ir/products/سوتلاوا/",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 9 | تست داده‌ای | `name: "باقلوا پسته‌ای",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 10 | تست داده‌ای | `focusKeyword: "باقلوا پسته‌ای",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 11 | تست داده‌ای | `seoTitle: "خرید باقلوا پسته‌ای اصل",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 17 | تست داده‌ای | `name: "باقلوا",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 18 | تست داده‌ای | `focusKeyword: "انواع باقلوا",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 30 | تست داده‌ای | `name: "باقلوا پسته ای ویژه",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 31 | تست داده‌ای | `focusKeyword: "باقلوا پسته اي",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 32 | تست داده‌ای | `seoTitle: "خرید باقلوا پسته ای اصل",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 36 | تست داده‌ای | `focusKeyword: ["محصول «باقلوا پسته‌ای»"],` | F2 |
| `src/lib/seo/conflicts.test.ts` | 37 | تست داده‌ای | `seoTitle: ["محصول «باقلوا پسته‌ای»"],` | F2 |
| `src/lib/seo/conflicts.test.ts` | 38 | تست داده‌ای | `metaDescription: ["محصول «باقلوا پسته‌ای»"],` | F2 |
| `src/lib/seo/conflicts.test.ts` | 55 | تست داده‌ای | `name: "باقلوا",` | F2 |
| `src/lib/seo/conflicts.test.ts` | 62 | تست داده‌ای | `seoTitle: ["دسته «باقلوا»"],` | F2 |
| `src/lib/seo/image-alt.test.ts` | 7 | تست داده‌ای | `expect(defaultImageAlt("باقلوا گردویی", "علی حان", 0)).toBe(` | F2 |
| `src/lib/seo/image-alt.test.ts` | 8 | تست داده‌ای | `"باقلوا گردویی علی حان",` | F2 |
| `src/lib/seo/image-alt.test.ts` | 13 | تست داده‌ای | `expect(defaultImageAlt("باقلوا گردویی", "علی حان", 1)).toBe(` | F2 |
| `src/lib/seo/image-alt.test.ts` | 14 | تست داده‌ای | `"باقلوا گردویی علی حان ۲",` | F2 |
| `src/lib/seo/image-alt.test.ts` | 16 | تست داده‌ای | `expect(defaultImageAlt(" سوتلاوا ", "علی حان", 4)).toBe(` | F2 |
| `src/lib/seo/image-alt.test.ts` | 17 | تست داده‌ای | `"سوتلاوا علی حان ۵",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 16 | تست داده‌ای | `const SITE = "https://alihan.ir";` | F2 |
| `src/lib/seo/jsonld.test.ts` | 21 | تست داده‌ای | `brandName: "علی حان",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 22 | تست داده‌ای | `name: "باقلوا گردویی",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 23 | تست داده‌ای | `slug: "baklava-gerdouyi",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 25 | تست داده‌ای | `categoryName: "باقلوا",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 26 | تست داده‌ای | `images: ["/api/media/products/baklava-gerdouyi-1-a3f9.webp"],` | F2 |
| `src/lib/seo/jsonld.test.ts` | 54 | تست داده‌ای | `url: "https://alihan.ir/products/baklava-gerdouyi",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 57 | تست داده‌ای | `"https://alihan.ir/api/media/products/baklava-gerdouyi-1-a3f9.webp",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 59 | تست داده‌ای | `expect(data.brand).toEqual({ "@type": "Brand", name: "علی حان" });` | F2 |
| `src/lib/seo/jsonld.test.ts` | 91 | تست داده‌ای | `brandName: "علی حان",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 92 | تست داده‌ای | `alternateNames: ["علیحان", "Alihan"],` | F2 |
| `src/lib/seo/jsonld.test.ts` | 96 | تست داده‌ای | `email: "info@alihan.ir",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 97 | تست داده‌ای | `sameAs: ["https://instagram.com/alihan"],` | F2 |
| `src/lib/seo/jsonld.test.ts` | 100 | تست داده‌ای | `expect(data.logo).toBe("https://alihan.ir/brand/logo-white.webp");` | F2 |
| `src/lib/seo/jsonld.test.ts` | 102 | تست داده‌ای | `expect(data.alternateName).toEqual(["علیحان", "Alihan"]);` | F2 |
| `src/lib/seo/jsonld.test.ts` | 117 | تست داده‌ای | `{ name: "باقلوا", path: "/category/baklava" },` | F2 |
| `src/lib/seo/jsonld.test.ts` | 126 | تست داده‌ای | `item: "https://alihan.ir/",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 131 | تست داده‌ای | `name: "باقلوا",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 132 | تست داده‌ای | `item: "https://alihan.ir/category/baklava",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 143 | تست داده‌ای | `url: "https://alihan.ir/products/x",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 173 | تست داده‌ای | `brandName: "علی حان",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 189 | تست داده‌ای | `name: "علی حان — شعبه ولیعصر",` | F2 |
| `src/lib/seo/jsonld.test.ts` | 190 | تست داده‌ای | `url: "https://alihan.ir/branches/valiasr",` | F2 |
| `src/lib/seo/keywords.test.ts` | 15 | تست داده‌ای | `{ label: "الف", focusKeyword: "باقلوا پسته ای" },` | F2 |
| `src/lib/seo/keywords.test.ts` | 16 | تست داده‌ای | `{ label: "ب", focusKeyword: "باقلوا پسته‌ای" },` | F2 |
| `src/lib/seo/keywords.test.ts` | 17 | تست داده‌ای | `{ label: "ج", focusKeyword: "باقلوا گردویی" },` | F2 |
| `src/lib/seo/keywords.test.ts` | 21 | تست داده‌ای | `).toEqual([{ keyword: "باقلوا پسته ای", labels: ["الف", "ب"] }]);` | F2 |
| `src/lib/seo/keywords.test.ts` | 64 | تست داده‌ای | `it("۴ متن هاویج یکتا و هرکدام حداقل ۲ پاراگراف", () => {` | F2 |
| `src/lib/seo/keywords.test.ts` | 65 | تست داده‌ای | `const havij = catalogProducts.filter((p) => p.categorySlug === "havij");` | F2 |
| `src/lib/seo/keywords.test.ts` | 66 | تست داده‌ای | `expect(havij).toHaveLength(4);` | F2 |
| `src/lib/seo/keywords.test.ts` | 67 | تست داده‌ای | `expect(new Set(havij.map((p) => p.description)).size).toBe(4);` | F2 |
| `src/lib/seo/keywords.test.ts` | 68 | تست داده‌ای | `for (const product of havij) {` | F2 |
| `src/lib/seo/keywords.test.ts` | 97 | تست داده‌ای | `it("دسته‌ی هاویج زیرمجموعه‌ی باقلوا و دسته‌ی شکلات noindex", () => {` | F2 |
| `src/lib/seo/keywords.test.ts` | 99 | تست داده‌ای | `expect(bySlug.get("havij")?.parentSlug).toBe("baklava");` | F2 |
| `src/lib/seo/metadata.test.ts` | 15 | تست داده‌ای | `siteUrl: "https://alihan.ir",` | F2 |
| `src/lib/seo/metadata.test.ts` | 16 | تست داده‌ای | `brandName: "علی حان",` | F2 |
| `src/lib/seo/metadata.test.ts` | 24 | تست داده‌ای | `name: "باقلوا گردویی",` | F2 |
| `src/lib/seo/metadata.test.ts` | 25 | تست داده‌ای | `slug: "baklava-gerdouyi",` | F2 |
| `src/lib/seo/metadata.test.ts` | 26 | تست داده‌ای | `seoTitle: "خرید باقلوا گردویی اصل و تازه",` | F2 |
| `src/lib/seo/metadata.test.ts` | 28 | تست داده‌ای | `description: "باقلوا گردویی با مغز گردوی تازه.",` | F2 |
| `src/lib/seo/metadata.test.ts` | 32 | تست داده‌ای | `url: "/api/media/products/baklava-gerdouyi-1-a3f9-og.jpg",` | F2 |
| `src/lib/seo/metadata.test.ts` | 35 | تست داده‌ای | `alt: "باقلوا",` | F2 |
| `src/lib/seo/metadata.test.ts` | 68 | تست داده‌ای | `expect(meta.title).toBe("خرید باقلوا گردویی اصل و تازه");` | F2 |
| `src/lib/seo/metadata.test.ts` | 70 | تست داده‌ای | `"https://alihan.ir/products/baklava-gerdouyi",` | F2 |
| `src/lib/seo/metadata.test.ts` | 72 | تست داده‌ای | `expect(meta.description).toBe("باقلوا گردویی با مغز گردوی تازه.");` | F2 |
| `src/lib/seo/metadata.test.ts` | 74 | تست داده‌ای | `title: "خرید باقلوا گردویی اصل و تازه \| علی حان",` | F2 |
| `src/lib/seo/metadata.test.ts` | 76 | تست داده‌ای | `url: "https://alihan.ir/products/baklava-gerdouyi",` | F2 |
| `src/lib/seo/metadata.test.ts` | 79 | تست داده‌ای | `url: "https://alihan.ir/api/media/products/baklava-gerdouyi-1-a3f9-og.jpg",` | F2 |
| `src/lib/seo/metadata.test.ts` | 95 | تست داده‌ای | `expect(meta.alternates?.canonical).toBe("https://alihan.ir/products/other");` | F2 |
| `src/lib/seo/metadata.test.ts` | 103 | تست داده‌ای | `title: "خرید باقلوای ترکی اصل و تازه \| علی حان",` | F2 |
| `src/lib/seo/metadata.test.ts` | 107 | تست داده‌ای | `absolute: "خرید باقلوای ترکی اصل و تازه \| علی حان",` | F2 |
| `src/lib/seo/metadata.test.ts` | 109 | تست داده‌ای | `expect(meta.alternates?.canonical).toBe("https://alihan.ir/");` | F2 |
| `src/lib/seo/metadata.test.ts` | 117 | تست داده‌ای | `expect(meta.title).toEqual({ default: "خانه", template: "%s \| علی حان" });` | F2 |
| `src/lib/seo/metadata.test.ts` | 168 | تست داده‌ای | `"https://alihan.ir/category/chocolate?page=2",` | F2 |
| `src/lib/seo/redirects.test.ts` | 21 | تست داده‌ای | `const encoded = '/product/${encodeURIComponent("باقلوا-گردویی")}/?utm_source=x';` | F2 |
| `src/lib/seo/redirects.test.ts` | 22 | تست داده‌ای | `expect(normalizeRedirectPath(encoded)).toBe("/product/باقلوا-گردویی");` | F2 |
| `src/lib/seo/redirects.test.ts` | 23 | تست داده‌ای | `expect(normalizeRedirectPath("/Shop//Baklava/")).toBe("/shop/baklava");` | F2 |
| `src/lib/seo/redirects.test.ts` | 24 | تست داده‌ای | `expect(normalizeRedirectPath("https://old.alihan.ir/About-Us/")).toBe(` | F2 |
| `src/lib/seo/redirects.test.ts` | 34 | تست داده‌ای | `expect(normalizeRedirectTarget("https://t.me/alihan")).toBe(` | F2 |
| `src/lib/seo/redirects.test.ts` | 35 | تست داده‌ای | `"https://t.me/alihan",` | F2 |
| `src/lib/seo/redirects.test.ts` | 47 | تست داده‌ای | `["/product/baklava", "", { kind: "redirect", to: "/products", log: true }],` | F2 |
| `src/lib/seo/redirects.test.ts` | 99 | تست داده‌ای | `for (const path of ["/product/باقلوا", "/about-us", "/blog/post-1"]) {` | F2 |
| `src/lib/seo/settings.ts` | 54 | پیش‌فرض محتوای سئو (seed-like) | `const HOME_DESCRIPTION = 'خرید آنلاین باقلوای ترکی ${DEFAULT_BRAND_NAME}؛ باقلوا گردویی، پسته‌ای، هاویج، کا…` | F2 |
| `src/lib/seo/settings.ts` | 58 | پیش‌فرض محتوای سئو (seed-like) | `'## باقلوای ترکی ${DEFAULT_BRAND_NAME}؛ طعم اصیل، تازه و دست‌ساز',` | F2 |
| `src/lib/seo/settings.ts` | 59 | پیش‌فرض محتوای سئو (seed-like) | `'باقلوای ترکی با لایه‌های نازک و ترد خمیر یوفکا، مغز پرملات و شربتی که نه زیاد شیرین است و نه کم، یکی از مح…` | F2 |
| `src/lib/seo/settings.ts` | 60 | پیش‌فرض محتوای سئو (seed-like) | `'## خرید آنلاین باقلوا از ${DEFAULT_BRAND_NAME}',` | F2 |
| `src/lib/seo/settings.ts` | 61 | پیش‌فرض محتوای سئو (seed-like) | `"برای خرید باقلوا کافی است محصول و وزن دلخواهتان را انتخاب کنید، سفارش را ثبت و مبلغ را کارت‌به‌کارت واریز …` | F2 |
| `src/lib/seo/settings.ts` | 62 | پیش‌فرض محتوای سئو (seed-like) | `"## انواع باقلوا و شیرینی ترکی",` | F2 |
| `src/lib/seo/settings.ts` | 64 | پیش‌فرض محتوای سئو (seed-like) | `"- [باقلوا گردویی](/products/baklava-gerdouyi)؛ کلاسیک و اصیل با مغز گردوی تازه",` | F2 |
| `src/lib/seo/settings.ts` | 65 | پیش‌فرض محتوای سئو (seed-like) | `"- [باقلوا پسته‌ای](/products/baklava-pesteei)؛ لوکس و مجلسی با پسته‌ی سبز",` | F2 |
| `src/lib/seo/settings.ts` | 66 | پیش‌فرض محتوای سئو (seed-like) | `"- [باقلوا مخلوط](/products/baklava-makhlut)؛ گردویی و پسته‌ای در یک جعبه",` | F2 |
| `src/lib/seo/settings.ts` | 67 | پیش‌فرض محتوای سئو (seed-like) | `"- [شیرینی هاویج](/category/havij)؛ برش‌های لوزی، با یا بدون سرشیر",` | F2 |
| `src/lib/seo/settings.ts` | 68 | پیش‌فرض محتوای سئو (seed-like) | `"- [کادایف پسته‌ای](/products/kadayif-pesteei)؛ رشته‌های طلایی و ترد دور مغز پسته",` | F2 |
| `src/lib/seo/settings.ts` | 69 | پیش‌فرض محتوای سئو (seed-like) | `"- [سوتلاوا](/products/sutlava)؛ باقلوای سرد با شربت شیری",` | F2 |
| `src/lib/seo/settings.ts` | 70 | پیش‌فرض محتوای سئو (seed-like) | `"- [کنافه پنیری](/products/kanafeh-panir)، [بامیه ترکی](/products/bamiyeh-torki) و [شکلات دبی](/products/ch…` | F2 |
| `src/lib/seo/settings.ts` | 73 | پیش‌فرض محتوای سئو (seed-like) | `'باقلواهای ${DEFAULT_BRAND_NAME} در بسته‌بندی‌های شیک و مناسب هدیه آماده می‌شوند. ${todo("مناطق تحت پوشش ار…` | F2 |
| `src/lib/seo/settings.ts` | 86 | پیش‌فرض محتوای سئو (seed-like) | `question: "باقلوا را چطور نگهداری کنیم و تا چه مدت تازه می‌ماند؟",` | F2 |
| `src/lib/seo/settings.ts` | 94 | پیش‌فرض محتوای سئو (seed-like) | `question: "تفاوت باقلوای ترکی با باقلوای ایرانی چیست؟",` | F2 |
| `src/lib/seo/settings.ts` | 113 | پیش‌فرض محتوای سئو (seed-like) | `[SEO_KEYS.homeTitle]: 'خرید باقلوای ترکی اصل و تازه \| ${DEFAULT_BRAND_NAME}',` | F2 |
| `src/lib/seo/settings.ts` | 115 | پیش‌فرض محتوای سئو (seed-like) | `[SEO_KEYS.homeH1]: 'خرید باقلوای ترکی ${DEFAULT_BRAND_NAME}',` | F2 |
| `src/lib/seo/text.test.ts` | 7 | تست داده‌ای | `expect(normalizeFa("باقلوا پسته ای")).toBe(normalizeFa("باقلوا پسته‌ای"));` | F2 |
| `src/lib/seo/text.test.ts` | 11 | تست داده‌ای | `expect(normalizeFa("كنافه پنيري")).toBe("کنافه پنیری");` | F2 |
| `src/lib/seo/text.test.ts` | 12 | تست داده‌ای | `expect(normalizeFa("باقـــلوا")).toBe("باقلوا");` | F2 |
| `src/lib/seo/text.test.ts` | 13 | تست داده‌ای | `expect(normalizeFa("شِیرینی")).toBe("شیرینی");` | F2 |
| `src/lib/seo/text.test.ts` | 19 | تست داده‌ای | `expect(normalizeFa("  Alihan   BAKLAVA ")).toBe("alihan baklava");` | F2 |
| `src/lib/seo/text.test.ts` | 20 | تست داده‌ای | `expect(normalizeFa("ALIHAN")).toBe(normalizeFa("Alihan"));` | F2 |
| `src/lib/seo/text.test.ts` | 42 | تست داده‌ای | `expect(truncateAtWord("باقلوا گردویی", 50)).toBe("باقلوا گردویی");` | F2 |
| `src/lib/seo/text.test.ts` | 46 | تست داده‌ای | `const text = "باقلوا گردویی علی حان با مغز گردوی تازه";` | F2 |
| `src/lib/seo/text.test.ts` | 49 | تست داده‌ای | `expect(cut).toBe("باقلوا گردویی علی…");` | F2 |
| `src/lib/seo/text.test.ts` | 59 | تست داده‌ای | `expect(countWords("باقلوا پسته‌ای")).toBe(2);` | F2 |
| `src/lib/seo/title.test.ts` | 10 | تست داده‌ای | `const settings = { brandName: "علی حان", titleTemplate: "%s \| {brandName}" };` | F2 |
| `src/lib/seo/title.test.ts` | 14 | تست داده‌ای | `expect(buildDocumentTitle("خرید باقلوا گردویی", settings)).toBe(` | F2 |
| `src/lib/seo/title.test.ts` | 15 | تست داده‌ای | `"خرید باقلوا گردویی \| علی حان",` | F2 |
| `src/lib/seo/title.test.ts` | 26 | تست داده‌ای | `expect(effectiveTitle("", "سوتلاوا")).toBe("سوتلاوا");` | F2 |
| `src/lib/seo/title.test.ts` | 27 | تست داده‌ای | `expect(effectiveTitle(null, "سوتلاوا")).toBe("سوتلاوا");` | F2 |
| `src/lib/seo/title.test.ts` | 28 | تست داده‌ای | `expect(effectiveTitle(" خرید سوتلاوا ", "سوتلاوا")).toBe("خرید سوتلاوا");` | F2 |
| `src/lib/site-content.ts` | 20 | محتوای پیش‌فرض سایت | `tagline: "باقلوا، یک دنیا طعم",` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 21 | محتوای پیش‌فرض سایت | `description: 'فروشگاه آنلاین باقلوا و شیرینی ${BRAND_NAME}؛ باقلوای لوکس ترکی با بهترین مواد اولیه و بسته‌ب…` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 58 | محتوای پیش‌فرض سایت | `eyebrow: "باقلواهای لوکس ترکی",` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 62 | محتوای پیش‌فرض سایت | `imageLabel: "اسلاید ۱ — سینی باقلوا پسته‌ای",` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 89 | محتوای پیش‌فرض سایت | `text: '${SITE.name} حاصل سال‌ها تجربه در هنر باقلواسازی ترکیه و تلاش برای ارائه طعمی اصیل و متفاوت به دوستد…` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 95 | محتوای پیش‌فرض سایت | `eyebrow: "باقلوای ترکی، تجربه‌ای متفاوت",` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 99 | محتوای پیش‌فرض سایت | `imageLabel: "بنر کلوزآپ باقلوا",` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 104 | محتوای پیش‌فرض سایت | `title: ["هنر باقلواسازی،", "نسل به نسل"],` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 108 | محتوای پیش‌فرض سایت | `'${SITE.name} کار خود را از سال ${SITE.establishedYear} با یک کارگاه کوچک و عشق به شیرینی‌های اصیل ترکی آغا…` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/site-content.ts` | 147 | محتوای پیش‌فرض سایت | `"سفارش‌ها پس از تأیید پرداخت آماده و با پست پیشتاز یا پیک در شهر تهران ارسال می‌شوند. باقلوا را در جای خشک …` | F2 (صفحه‌ی اصلی: F6) |
| `src/lib/slug.test.ts` | 12 | تست داده‌ای | `["Baklava Gerdouyi", "baklava-gerdouyi"],` | F2 |
| `src/lib/slug.test.ts` | 13 | تست داده‌ای | `["  Havij -- Pesteei!! ", "havij-pesteei"],` | F2 |
| `src/lib/slug.test.ts` | 16 | تست داده‌ای | `["باقلوا گردویی", ""],` | F2 |
| `src/lib/slug.test.ts` | 31 | تست داده‌ای | `expect(SLUG_PATTERN.test("baklava-gerdouyi")).toBe(true);` | F2 |
| `src/lib/slug.test.ts` | 32 | تست داده‌ای | `expect(SLUG_PATTERN.test("باقلوا")).toBe(false);` | F2 |
| `src/lib/slug.test.ts` | 33 | تست داده‌ای | `expect(SLUG_PATTERN.test("Baklava")).toBe(false);` | F2 |
| `src/lib/sms/sms.test.ts` | 24 | تست داده‌ای | `expect(sanitizeSmsArg("علی؛حان")).toBe("علی حان");` | F2 |
| `src/lib/sms/sms.test.ts` | 31 | تست داده‌ای | `expect(sanitizeSmsArg("AL-14040625-0031")).toBe("AL-14040625-0031");` | F2 |
| `src/lib/sms/sms.test.ts` | 35 | تست داده‌ای | `const text = ["AL-1", "بامزه;تقلبی", "99"].map(sanitizeSmsArg).join(";");` | F2 |
| `src/lib/sms/sms.test.ts` | 36 | تست داده‌ای | `expect(text.split(";")).toEqual(["AL-1", "بامزه تقلبی", "99"]);` | F2 |
| `src/lib/sms/sms.test.ts` | 49 | تست داده‌ای | `args: ["AL-1", "a;b"],` | F2 |
| `src/lib/sms/sms.test.ts` | 66 | تست داده‌ای | `expect(body.get("text")).toBe("AL-1;a b");` | F2 |
| `src/lib/utils.test.ts` | 13 | تست داده‌ای | `expect(toPersianDigits("AL-14040625-0031")).toBe("AL-۱۴۰۴۰۶۲۵-۰۰۳۱");` | F2 |
| `src/lib/validation/settings.test.ts` | 25 | تست داده‌ای | `accountHolderName: "علی حان",` | F2 |
| `src/server/auth/password-hash.test.ts` | 11 | تست داده‌ای | `const hash = await hashPassword("Alihan1405");` | F2 |
| `src/server/auth/password-hash.test.ts` | 12 | تست داده‌ای | `expect(await verifyPassword("Alihan1405", hash)).toBe(true);` | F2 |
| `src/server/auth/password-hash.test.ts` | 13 | تست داده‌ای | `expect(await verifyPassword("alihan1405", hash)).toBe(false);` | F2 |
| `src/server/auth/password-hash.test.ts` | 18 | تست داده‌ای | `const a = await hashPassword("Alihan1405");` | F2 |
| `src/server/auth/password-hash.test.ts` | 19 | تست داده‌ای | `const b = await hashPassword("Alihan1405");` | F2 |
| `src/server/auth/password-hash.test.ts` | 24 | تست داده‌ای | `expect(a).not.toContain("Alihan1405");` | F2 |
| `src/server/auth/password-hash.test.ts` | 37 | تست داده‌ای | `const hash = await hashPassword("Alihan1405");` | F2 |
| `src/server/auth/password-hash.test.ts` | 39 | تست داده‌ای | `expect(await verifyPassword("Alihan1405", tampered)).toBe(false);` | F2 |
| `src/server/services/menu.int.test.ts` | 94 | تست داده‌ای | `const a = (await addMenuCategory(menuId, "باقلوا")).id;` | F2 |
| `src/server/services/menu.int.test.ts` | 105 | تست داده‌ای | `expect(menu?.categories.map((c) => c.name)).toEqual(["دمنوش", "باقلوا"]);` | F2 |
| `src/server/services/menu.int.test.ts` | 158 | تست داده‌ای | `const category = (await addMenuCategory(source, "باقلوا")).id;` | F2 |
| `src/server/services/notification.int.test.ts` | 299 | تست داده‌ای | `ORDER_PLACED: "سفارش {0} به مبلغ {1} برای {2} ثبت شد. alihan.ir",` | F2 |
| `src/server/services/notification.int.test.ts` | 313 | تست داده‌ای | `'سفارش ${orderNumber} به مبلغ 490,000 برای ${RECEIVER} ثبت شد. alihan.ir',` | F2 |
| `src/server/services/order-delete.int.test.ts` | 76 | تست داده‌ای | `await expect(deleteOrder(adminId, orderId, "AL-WRONG")).rejects.toThrow(` | F2 |
| `src/server/services/password-login.int.test.ts` | 27 | تست داده‌ای | `const PASSWORD = "Alihan1405";` | F2 |
| `src/server/services/product-image.int.test.ts` | 114 | تست داده‌ای | `await changeImageAlt(dto.id, "  برش نزدیک   باقلوا ");` | F2 |
| `src/server/services/product-image.int.test.ts` | 118 | تست داده‌ای | `expect(image.alt).toBe("برش نزدیک باقلوا");` | F2 |
| `src/server/services/redirect.int.test.ts` | 61 | تست داده‌ای | `const old = '/product/باقلوا-گردویی-${RUN}';` | F2 |
| `src/server/services/redirect.int.test.ts` | 65 | تست داده‌ای | `"/products/baklava-gerdouyi",` | F2 |
| `src/server/services/redirect.int.test.ts` | 69 | تست داده‌ای | `const requested = '/product/${encodeURIComponent('باقلوا-گردویی-${RUN}')}/';` | F2 |
| `src/server/services/redirect.int.test.ts` | 72 | تست داده‌ای | `to: "/products/baklava-gerdouyi",` | F2 |
| `src/server/services/sms-connection.int.test.ts` | 41 | تست داده‌ای | `username: "alihan-panel",` | F2 |
| `src/server/services/sms-connection.int.test.ts` | 53 | تست داده‌ای | `username: "alihan-panel",` | F2 |
| `src/server/services/sms-connection.int.test.ts` | 70 | تست داده‌ای | `username: "alihan-panel",` | F2 |
| `src/server/services/sms-connection.int.test.ts` | 78 | تست داده‌ای | `username: "alihan-panel",` | F2 |

## پ) رنگ‌های هگز تم (برای F6)

تم علی حان (سبز تیره + طلایی) در `src/app/globals.css` در بلوک `@theme` تعریف شده و بخشی از رنگ‌ها در کامپوننت‌ها سخت‌کد است. جایگزینی با توکن‌های معنایی طبق ۵.۱ در **F6 مرحله‌ی ۱** انجام می‌شود؛ در F1 عمداً دست‌نخورده ماند.

| فایل:خط | متن |
|---|---|
| `src/middleware.ts:43` | `'<!doctype html><html lang="fa-IR" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noind…` |
| `src/app/globals.css:10` | `--color-page: #071009;` |
| `src/app/globals.css:11` | `--color-canvas: #0b1f16;` |
| `src/app/globals.css:12` | `--color-panel: #0f2a1d;` |
| `src/app/globals.css:13` | `--color-card: #12301f;` |
| `src/app/globals.css:14` | `--color-placeholder: #2b342e;` |
| `src/app/globals.css:15` | `--color-action: #2fa84f;` |
| `src/app/globals.css:16` | `--color-action-hover: #38bd5c;` |
| `src/app/globals.css:17` | `--color-action-ink: #08200f;` |
| `src/app/globals.css:18` | `--color-action-deep: #22713a;` |
| `src/app/globals.css:19` | `--color-action-deep-hover: #2a8546;` |
| `src/app/globals.css:20` | `--color-gold: #c9a876;` |
| `src/app/globals.css:21` | `--color-gold-hover: #dbbc8c;` |
| `src/app/globals.css:22` | `--color-ink: #f5f0e8;` |
| `src/app/globals.css:23` | `--color-ink-2: #b4bfb8;` |
| `src/app/globals.css:24` | `--color-muted: #94a29a;` |
| `src/app/globals.css:25` | `--color-faint: #88968d;` |
| `src/app/globals.css:26` | `--color-danger: #e06b5b;` |
| `src/app/globals.css:28` | `--color-canvas-hover: #183c27;` |
| `src/app/globals.css:66` | `scrollbar-color: #2b3f33 var(--color-canvas);` |
| `src/components/auth/auth-ui.tsx:21` | `className="rounded-[18px] border border-[#E06B5B]/40 bg-[#E06B5B]/10 px-4 py-3 text-sm text-[#E06B5B]"` |
| `src/components/shop/BottomTabBar.tsx:33` | `className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-[rgb(201_168_118…` |
| `src/components/shop/Placeholder.tsx:33` | `"font-mono text-[#a7b2ab]",` |
| `src/components/shop/Placeholder.tsx:42` | `className={cn("text-[#a7b2ab]", compact ? "text-[10px]" : "text-xs")}` |
| `src/components/shop/cart/QuickAdd.tsx:72` | `className="bg-panel absolute inset-x-2 bottom-2 z-10 flex animate-[fade_150ms_ease] flex-col gap-3 rounded-…` |
| `src/components/shop/cart/CartPageView.tsx:59` | `className="rounded-[14px] border border-[#E06B5B]/40 bg-[#E06B5B]/10 px-4 py-3 text-sm text-[#E06B5B]"` |
| `src/components/shop/HeroCarousel.tsx:27` | `stroke="#2FA84F"` |
| `src/components/shop/HeroCarousel.tsx:35` | `stroke="#C9A876"` |
| `src/components/shop/ProductPurchase.tsx:115` | `<div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-[rgb(201_168_118/0.16…` |
| `src/components/shop/MobileMenu.tsx:28` | `stroke="#2FA84F"` |
| `src/components/shop/MobileMenu.tsx:36` | `stroke="#C9A876"` |
| `src/components/shop/MobileMenu.tsx:99` | `className="fixed inset-0 z-50 flex animate-[fade_250ms_ease] flex-col overflow-y-auto bg-[#081A11] px-5 pt-…` |
| `src/components/admin/dashboard/Charts.tsx:22` | `"#15803d",` |
| `src/components/admin/dashboard/Charts.tsx:23` | `"#b45309",` |
| `src/components/admin/dashboard/Charts.tsx:24` | `"#1d4ed8",` |
| `src/components/admin/dashboard/Charts.tsx:25` | `"#be123c",` |
| `src/components/admin/dashboard/Charts.tsx:26` | `"#7c3aed",` |
| `src/components/admin/dashboard/Charts.tsx:27` | `"#0f766e",` |
| `src/components/admin/dashboard/Charts.tsx:28` | `"#4b5563",` |
| `src/components/admin/dashboard/Charts.tsx:53` | `<CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />` |
| `src/components/admin/dashboard/Charts.tsx:70` | `stroke="#15803d"` |
| `src/components/admin/dashboard/Charts.tsx:115` | `<span style={{ marginRight: 6, color: "#404040" }}>` |
| `src/components/menu/MenuBody.tsx:75` | `? "border-gold bg-gold text-[#1b1408]"` |
| `src/lib/image/process.ts:38` | `.flatten({ background: "#ffffff" })` |
| `src/lib/image/image.test.ts:29` | `create: { width, height, channels: 3, background: "#c0392b" },` |
