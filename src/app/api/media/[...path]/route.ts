import { publicMediaContentType } from "@/lib/image/urls";
import { LocalStorageDriver } from "@/lib/storage";

export const runtime = "nodejs";

const local = new LocalStorageDriver();

/**
 * سرو فایل‌های `public/uploads` (driver محلی). مستقل از `STORAGE_DRIVER`
 * است تا آدرس‌های قدیمی بعد از رفتن به S3 هم کار کنند. هر مسیری خارج از
 * الگوی بالا (از جمله مسیرهای خصوصی مثل رسیدها) ۴۰۴ می‌گیرد.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const key = (await params).path.join("/");
  // فقط تصاویر عمومی (محصول، منو، بنر)؛ رسیدها و هر مسیر دیگر ۴۰۴
  const contentType = publicMediaContentType(key);
  if (!contentType) return new Response("Not found", { status: 404 });

  const file = await local.read(key);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      // نام‌ها شناسه‌ی تصادفی دارند و تغییرناپذیرند
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
