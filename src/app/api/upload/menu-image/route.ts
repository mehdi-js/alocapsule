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
import { setMenuItemImage } from "@/server/services/menu-image.service";

export const runtime = "nodejs";

const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 512 * 1024;

/** تصویر بندانگشتی آیتم منو (ادمین): نقش ← حجم ← فرم ← service */
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

  const itemId = parsed.form.get("itemId");
  const file = parsed.form.get("file");
  if (typeof itemId !== "string" || !itemId || !(file instanceof File)) {
    return json({ ok: false, message: "درخواست نامعتبر است." }, 400);
  }
  if (file.size > MAX_IMAGE_BYTES) return tooLarge;

  try {
    const result = await setMenuItemImage(
      itemId,
      Buffer.from(await file.arrayBuffer()),
    );
    if (result.slug) revalidatePath(`/menu/${result.slug}`);
    revalidatePath("/admin/menus", "layout");
    return json({ ok: true, imageUrl: result.imageUrl });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return json({ ok: false, message: error.message }, 400);
    }
    logUploadFailure("menu_image_upload_failed", error);
    return json(
      { ok: false, message: "آپلود ناموفق بود. دوباره تلاش کنید." },
      500,
    );
  }
}
