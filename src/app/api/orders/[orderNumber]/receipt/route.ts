import { revalidatePath } from "next/cache";

import { MAX_IMAGE_BYTES } from "@/lib/image/config";
import { toPersianDigits } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/current-user";
import { UserFacingError } from "@/server/errors";
import {
  isSameOrigin,
  json,
  logUploadFailure,
  readMultipart,
} from "@/server/http/upload";
import { submitReceipt } from "@/server/services/payment.service";

export const runtime = "nodejs";

const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 512 * 1024;
const TOO_LARGE_MESSAGE = `حجم تصویر رسید بیشتر از ${toPersianDigits(MAX_IMAGE_BYTES / 1024 / 1024)} مگابایت است.`;

/**
 * ثبت رسید کارت به کارت (فقط صاحب سفارش). ترتیب: کاربر ← origin ← حجم ←
 * Zod ← service (magic bytes، WebP، ذخیره‌ی خصوصی uuid‌دار، تراکنش).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, message: "ابتدا وارد شوید." }, 401);
  if (!isSameOrigin(request)) {
    return json({ ok: false, message: "درخواست نامعتبر است." }, 403);
  }

  const parsed = await readMultipart(request, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return parsed.reason === "too_large"
      ? json({ ok: false, message: TOO_LARGE_MESSAGE }, 413)
      : json({ ok: false, message: "درخواست نامعتبر است." }, 400);
  }
  const { form } = parsed;

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json(
      {
        ok: false,
        message: "تصویر رسید را انتخاب کنید",
        fieldErrors: { file: "تصویر رسید را انتخاب کنید" },
      },
      400,
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return json({ ok: false, message: TOO_LARGE_MESSAGE }, 413);
  }

  const orderNumber = decodeURIComponent((await params).orderNumber);
  try {
    await submitReceipt({
      userId: user.id,
      orderNumber,
      file: Buffer.from(await file.arrayBuffer()),
    });
    revalidatePath(`/checkout/pay/${orderNumber}`);
    revalidatePath("/admin/payments", "layout");
    return json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return json({ ok: false, message: error.message }, 400);
    }
    logUploadFailure("receipt_upload_failed", error);
    return json(
      { ok: false, message: "ثبت رسید ناموفق بود. دوباره تلاش کنید." },
      500,
    );
  }
}
