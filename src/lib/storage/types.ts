export interface StoragePutParams {
  /** مثل `products/<uuid>.webp` — فقط حروف کوچک لاتین، عدد و `/ . _ -` */
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * لایه‌ی ذخیره‌ی فایل. رکوردهای دیتابیس فقط آدرس عمومی (`publicUrl`) را نگه
 * می‌دارند؛ بنابراین UI به driver وابسته نیست و با تعویض `STORAGE_DRIVER`
 * فقط آپلودهای جدید به مقصد جدید می‌روند.
 */
export interface StorageDriver {
  readonly name: "local" | "s3";
  put(params: StoragePutParams): Promise<void>;
  /** حذف بی‌خطا: نبودن فایل خطا نیست */
  delete(key: string): Promise<void>;
  /** آدرسی که در `ProductImage.url` ذخیره و در `<img>` استفاده می‌شود */
  publicUrl(key: string): string;
  /** برعکس `publicUrl`؛ اگر آدرس مال این driver نباشد `null` */
  keyFromUrl(url: string): string | null;
}
