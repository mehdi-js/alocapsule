import { slugify } from "@/lib/slug";

const MAIN_SUFFIX = ".webp";
const THUMB_SUFFIX = "-thumb.webp";
const OG_SUFFIX = "-og.jpg";

/**
 * نام فایل تصویر محصول (SEO.md §۹): `{نامک}-{ردیف}-{۴ نویسه}` مثل
 * `baklava-gerdouyi-1-a3f9`. نامک غیرلاتین (قدیمی) ⇒ `product`.
 * رسیدها همچنان uuid و خصوصی‌اند.
 */
export function productImageBaseName(
  productSlug: string,
  index: number,
  shortId: string,
): string {
  return `${slugify(productSlug) || "product"}-${index}-${shortId}`;
}

/** کلید فایل اصلی، thumbnail و برش OG از روی نام پایه */
export function productImageKeys(base: string): {
  main: string;
  thumb: string;
  og: string;
} {
  return {
    main: `products/${base}${MAIN_SUFFIX}`,
    thumb: `products/${base}${THUMB_SUFFIX}`,
    og: `products/${base}${OG_SUFFIX}`,
  };
}

/** آدرس thumbnail از روی آدرس تصویر اصلی (قرارداد نام‌گذاری `-thumb`) */
export function thumbnailUrl(url: string): string {
  return url.endsWith(MAIN_SUFFIX)
    ? `${url.slice(0, -MAIN_SUFFIX.length)}${THUMB_SUFFIX}`
    : url;
}

/** کلید thumbnail از روی کلید تصویر اصلی */
export function thumbnailKey(key: string): string {
  return thumbnailUrl(key);
}

/** کلید برش OG از روی کلید تصویر اصلی (تصاویر قدیمی این فایل را ندارند) */
export function ogImageKey(key: string): string {
  return key.endsWith(MAIN_SUFFIX)
    ? `${key.slice(0, -MAIN_SUFFIX.length)}${OG_SUFFIX}`
    : key;
}

/** همه‌ی فایل‌های یک تصویر محصول (برای حذف) */
export function productImageFileKeys(mainKey: string): string[] {
  return [mainKey, thumbnailKey(mainKey), ogImageKey(mainKey)];
}

/** کلید تصویر آیتم منو (یک فایل مربع، بدون thumbnail جدا) */
export function menuImageKey(id: string): string {
  return `menu/${id}${MAIN_SUFFIX}`;
}

/** کلید تصویر بنر/اسلاید (نسخه‌ی دسکتاپ یا موبایل) */
export function bannerImageKey(id: string): string {
  return `banners/${id}${MAIN_SUFFIX}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PRODUCT_BASE = `(?:${UUID}|[a-z0-9]+(?:-[a-z0-9]+)*-\\d{1,3}-[0-9a-f]{4})`;
const PUBLIC_MEDIA_KEY = new RegExp(
  `^(?:products/${PRODUCT_BASE}(?:-thumb\\.webp|\\.webp|-og\\.jpg)|(?:menu|banners)/${UUID}\\.webp)$`,
);

/**
 * فقط فایل‌های عمومی سرو می‌شوند: تصاویر محصول (اصلی، thumbnail، OG)، منو
 * و بنر. هر کلید دیگری (از جمله رسیدها) ⇒ `null` (۴۰۴).
 */
export function publicMediaContentType(key: string): string | null {
  if (!PUBLIC_MEDIA_KEY.test(key)) return null;
  return key.endsWith(".jpg") ? "image/jpeg" : "image/webp";
}
