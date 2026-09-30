import { z } from "zod";

import { toLatinDigits } from "@/lib/utils";

/**
 * کد رهگیری ارسال (پست یا پیک). ارقام فارسی ⇒ لاتین؛ برای پیک می‌تواند
 * متن کوتاه باشد (مثل نام و شماره‌ی پیک). `;` در ارسال پیامک پاک‌سازی می‌شود.
 */
export const trackingCodeSchema = z
  .string()
  .transform((value) => toLatinDigits(value).replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(3, "کد رهگیری حداقل ۳ کاراکتر باشد")
      .max(60, "کد رهگیری حداکثر ۶۰ کاراکتر باشد"),
  );
