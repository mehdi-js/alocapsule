import { getCurrentUser } from "@/server/auth/current-user";
import { getReceiptImage } from "@/server/services/payment-page.service";

export const runtime = "nodejs";

/** رسید هرگز نباید ایندکس شود (SEO.md §۸.۲)، حتی پاسخ خطا */
const NO_INDEX = { "X-Robots-Tag": "noindex, nofollow" };
const NOT_FOUND = () =>
  new Response("Not found", { status: 404, headers: NO_INDEX });

/**
 * سرو تصویر رسید (بند ۸): فقط صاحب سفارش یا ادمین. رسید دیگران و رسید
 * ناموجود پاسخ یکسان ۴۰۴ می‌گیرند. هرگز در کش مشترک ذخیره نمی‌شود.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return new Response("Unauthorized", { status: 401, headers: NO_INDEX });

  const { paymentId } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(paymentId)) return NOT_FOUND();

  const image = await getReceiptImage(paymentId, user);
  if (!image) return NOT_FOUND();

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      ...NO_INDEX,
    },
  });
}
