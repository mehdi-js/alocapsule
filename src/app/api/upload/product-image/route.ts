import { MAX_IMAGE_BYTES } from "@/lib/image/config";
import { toPersianDigits } from "@/lib/utils";
import { revalidateCatalog } from "@/server/actions/types";
import { getCurrentUser } from "@/server/auth/current-user";
import { UserFacingError } from "@/server/errors";
import {
  isSameOrigin,
  json,
  logUploadFailure,
  readMultipart,
} from "@/server/http/upload";
import { addProductImage } from "@/server/services/product-image.service";

export const runtime = "nodejs";

/** بدنه‌ی multipart: فایل + سربار فیلدها */
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 512 * 1024;

/**
 * آپلود تصویر محصول (ادمین). ترتیب: نقش ← حجم ← فرم ← service
 * (magic bytes، فشرده‌سازی، thumbnail، ذخیره‌ی uuid‌دار).
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

  const productId = parsed.form.get("productId");
  const file = parsed.form.get("file");
  if (typeof productId !== "string" || !productId || !(file instanceof File)) {
    return json({ ok: false, message: "درخواست نامعتبر است." }, 400);
  }
  if (file.size > MAX_IMAGE_BYTES) return tooLarge;

  try {
    const image = await addProductImage(
      productId,
      Buffer.from(await file.arrayBuffer()),
    );
    revalidateCatalog();
    return json({ ok: true, image });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return json({ ok: false, message: error.message }, 400);
    }
    logUploadFailure("image_upload_failed", error);
    return json(
      { ok: false, message: "آپلود ناموفق بود. دوباره تلاش کنید." },
      500,
    );
  }
}
