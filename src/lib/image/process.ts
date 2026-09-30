import sharp from "sharp";

import {
  MAIN_IMAGE_QUALITY,
  MAIN_IMAGE_SIZE,
  MAX_INPUT_PIXELS,
  MENU_IMAGE_QUALITY,
  MENU_IMAGE_SIZE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_QUALITY,
  OG_IMAGE_WIDTH,
  RECEIPT_IMAGE_QUALITY,
  RECEIPT_IMAGE_SIZE,
  THUMB_IMAGE_QUALITY,
  THUMB_IMAGE_SIZE,
} from "./config";

export interface ProcessedImage {
  main: Buffer;
  thumb: Buffer;
  /** برش ۱۲۰۰×۶۳۰ JPEG برای Open Graph */
  og: Buffer;
  /** ابعاد فایل اصلی (برای جلوگیری از layout shift و schema) */
  width: number;
  height: number;
}

/** برش OG با تمرکز روی بخش پرجزئیات تصویر (sharp «attention») */
function encodeOg(input: Buffer) {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fit: "cover",
      position: "attention",
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: OG_IMAGE_QUALITY, mozjpeg: true })
    .toBuffer();
}

/** جهت EXIF اعمال، متادیتا (EXIF/GPS) حذف و بدون بزرگ‌کردن، در کادر `size` جا می‌شود. */
function encode(input: Buffer, size: number, quality: number) {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({
      width: size,
      height: size,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });
}

/**
 * تصویر را به WebP فشرده تبدیل می‌کند و thumbnail و برش OG می‌سازد.
 * فایل خراب ⇒ خطا (توسط فراخواننده گرفته می‌شود).
 */
export async function processProductImage(
  input: Buffer,
): Promise<ProcessedImage> {
  const [main, thumb, og] = await Promise.all([
    encode(input, MAIN_IMAGE_SIZE, MAIN_IMAGE_QUALITY),
    encode(input, THUMB_IMAGE_SIZE, THUMB_IMAGE_QUALITY),
    encodeOg(input),
  ]);
  return {
    main: main.data,
    thumb: thumb.data,
    og,
    width: main.info.width,
    height: main.info.height,
  };
}

/** رسید پرداخت: WebP، بدون متادیتا (EXIF/GPS)، ضلع بلند حداکثر ۲۴۰۰ پیکسل */
export async function processReceiptImage(input: Buffer): Promise<Buffer> {
  const { data } = await encode(
    input,
    RECEIPT_IMAGE_SIZE,
    RECEIPT_IMAGE_QUALITY,
  );
  return data;
}

/** تصویر آیتم منو: مربع با برش مرکزی، WebP، بدون متادیتا */
export async function processMenuImage(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({
      width: MENU_IMAGE_SIZE,
      height: MENU_IMAGE_SIZE,
      fit: "cover",
      position: "attention",
    })
    .webp({ quality: MENU_IMAGE_QUALITY })
    .toBuffer();
}

/**
 * بنر/اسلاید: فقط کوچک‌سازی تا عرض `maxWidth` (بدون برش؛ برش را کادر صفحه
 * با object-cover انجام می‌دهد)، WebP، بدون متادیتا.
 */
export async function processBannerImage(
  input: Buffer,
  maxWidth: number,
): Promise<Buffer> {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
