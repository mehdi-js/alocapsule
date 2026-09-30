/** حداکثر حجم هر فایل آپلودی */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** حداکثر تعداد تصویر هر محصول (محدودیت محافظتی) */
export const MAX_IMAGES_PER_PRODUCT = 10;

/** ضلع بلند تصویر اصلی و thumbnail (پیکسل) */
export const MAIN_IMAGE_SIZE = 1600;
export const THUMB_IMAGE_SIZE = 400;
export const MAIN_IMAGE_QUALITY = 82;
export const THUMB_IMAGE_QUALITY = 78;

/** برش اشتراک‌گذاری (Open Graph)؛ JPEG چون همه‌ی پیام‌رسان‌ها WebP را نشان نمی‌دهند */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_QUALITY = 82;

/** سقف پیکسل ورودی؛ جلوی «بمب تصویری» (فایل کوچک با ابعاد عظیم) را می‌گیرد */
export const MAX_INPUT_PIXELS = 40_000_000;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const INVALID_IMAGE_MESSAGE =
  "فایل انتخاب‌شده تصویر معتبر نیست (فقط JPG، PNG یا WebP).";

/** رسید پرداخت: خوانایی ارقام مهم‌تر از حجم است */
export const RECEIPT_IMAGE_SIZE = 2400;
export const RECEIPT_IMAGE_QUALITY = 85;

/** تصویر بندانگشتی منوی شعبه: مربع (برش مرکزی)، دو برابر اندازه‌ی نمایش برای صفحه‌های رتینا */
export const MENU_IMAGE_SIZE = 320;
export const MENU_IMAGE_QUALITY = 80;
