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
import { uploadBannerImage } from "@/server/services/banner.service";

export const runtime = "nodejs";

const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 512 * 1024;

/**
 * تصویر اسلاید/بنر (ادمین): نسخه‌ی دسکتاپ یا موبایل. فقط آدرس برمی‌گردد؛
 * ثبت در تنظیمات با «ذخیره»ی فرم است.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, message: "ابتدا وارد شوید." }, 401);
  if (user.role !== "ADMIN") {
    return json({ ok: false, message: "دسترسی مجاز نیست." }, 403);
  }
  if (!isSameOrigin(request)) {
    return json({ ok: false, message: "درخواست نامعتبر است." }, 403);
  }

  const tooLarge = json(
    {
      ok: false,
      message: `حجم فایل بیشتر از ${toPersianDigits(MAX_IMAGE_BYTES / 1024 / 1024)} مگابایت است.`,
    },
    413,
  );
  const parsed = await readMultipart(request, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return parsed.reason === "too_large"
      ? tooLarge
      : json({ ok: false, message: "درخواست نامعتبر است." }, 400);
  }
  const variant = parsed.form.get("variant");
  const file = parsed.form.get("file");
  if (
    (variant !== "desktop" && variant !== "mobile") ||
    !(file instanceof File)
  ) {
    return json({ ok: false, message: "درخواست نامعتبر است." }, 400);
  }
  if (file.size > MAX_IMAGE_BYTES) return tooLarge;

  try {
    const url = await uploadBannerImage(
      Buffer.from(await file.arrayBuffer()),
      variant,
    );
    return json({ ok: true, url });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return json({ ok: false, message: error.message }, 400);
    }
    logUploadFailure("banner_upload_failed", error);
    return json(
      { ok: false, message: "آپلود ناموفق بود. دوباره تلاش کنید." },
      500,
    );
  }
}
