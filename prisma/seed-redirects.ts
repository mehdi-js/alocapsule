/**
 * ریدایرکت‌های احتیاطی آدرس‌های سایت وردپرس فعلی (SEO.md §۹.۱). سایت قدیمی فقط
 * حدود یک هفته فعال بوده؛ نقشه‌ی مهاجرت کامل لازم نیست. مسیرها با
 * `normalizeRedirectPath` (ارقام فارسی ⇒ لاتین، decode درصدی، بدون اسلش انتهایی)
 * ذخیره می‌شوند، پس نسخه‌ی فارسی/لاتین رقم یک ردیف‌اند. هر آدرس دیگر ⇒ 404
 * عادی و ثبت در `NotFoundLog` (§۹.۲).
 */

export interface SeedRedirect {
  from: string;
  to: string;
}

const refill = (size: string, valve: "butane" | "persi") =>
  `/products/gas-capsule-refill-${size}kg?valve=${valve}`;

/** برچسب نوع شیر در آدرس قدیمی */
const VALVE_LABELS = { butane: "بوتان", persi: "پرسی" } as const;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const fa = (value: string) =>
  value.replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]!);

export const SEED_REDIRECTS: SeedRedirect[] = [
  // شارژ: آدرس قدیمی هر اندازه × نوع شیر (ارقام فارسی در سایت قدیمی)
  ...(["11", "25", "33", "50"] as const).flatMap((size) =>
    (["butane", "persi"] as const).map((valve) => ({
      from: `/product/شارژ-کپسول-گاز-${fa(size)}-کیلویی-${VALVE_LABELS[valve]}/`,
      to: refill(size, valve),
    })),
  ),
  // خرید کپسول نو (ارقام لاتین در سایت قدیمی)
  ...(["11", "25", "33", "50"] as const).map((size) => ({
    from: `/product/خرید-کپسول-گاز-${size}-کیلویی/`,
    to: `/products/buy-gas-capsule-${size}kg`,
  })),
  { from: "/product/خرید-پیک-نیک/", to: "/products/picnic-gas" },
  {
    from: "/product/شارژ-کپسول-اکسیژن-۴۰-کیلویی/",
    to: "/products/oxygen-capsule-refill",
  },
  {
    from: "/product/شارژ-کپسول-گازهای-ترکیبی/",
    to: "/products/industrial-gas-refill",
  },
  // دسته‌ها
  {
    from: "/product-category/شارژ-کپسول-گاز/",
    to: "/category/gas-capsule-refill",
  },
  {
    from: "/product-category/خرید-کپسول-گاز/",
    to: "/category/buy-gas-capsule",
  },
  { from: "/product-category/خرید-پیک-نیک/", to: "/products/picnic-gas" },
  {
    from: "/product-category/شارژ-کپسول-اکسیژن/",
    to: "/products/oxygen-capsule-refill",
  },
  // صفحه‌های اصلی سایت قدیمی
  { from: "/shop/", to: "/products" },
  { from: "/home/", to: "/" },
  { from: "/about-us/", to: "/about" },
  { from: "/dashboard/", to: "/account" },
  { from: "/auth", to: "/login" },
  { from: "/blog/", to: "/" },
  // `/contact/` ⇒ `/contact` و `/cart/` ⇒ `/cart` ردیف نمی‌خواهند: بعد از
  // نرمال‌سازی مبدأ و مقصد یکی است و اسلش انتهایی را middleware با 308 برمی‌دارد.
];
