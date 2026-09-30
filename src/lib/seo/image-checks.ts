import { toPersianDigits } from "@/lib/utils";

import type { SeoCheck } from "./analyze";
import { normalizeFa } from "./text";

const fa = (value: number) => toPersianDigits(value);

/** alt بدون شماره (altهای پیش‌فرض «نام برند ۲»، «نام برند ۳» یکی حساب می‌شوند) */
function altKey(alt: string): string {
  return normalizeFa(alt).replace(/\d+/g, "").replace(/\s+/g, " ").trim();
}

/** چک‌های تصویر محصول (SEO.md §۹ و §۱۰.۲) */
export function imageChecks(
  images: { alt: string; isPrimary: boolean }[],
): SeoCheck[] {
  if (images.length === 0) {
    return [
      { id: "primaryImage", status: "bad", message: "هنوز تصویری ندارد." },
    ];
  }
  const missingAlt = images.filter((image) => !image.alt.trim()).length;
  const checks: SeoCheck[] = [
    missingAlt === 0
      ? {
          id: "imageAlt",
          status: "good",
          message: "همه‌ی تصاویر متن جایگزین (alt) دارند.",
        }
      : {
          id: "imageAlt",
          status: "bad",
          message: `${fa(missingAlt)} تصویر متن جایگزین (alt) ندارد.`,
        },
    images.some((image) => image.isPrimary)
      ? {
          id: "primaryImage",
          status: "good",
          message: "تصویر اصلی تعیین شده است.",
        }
      : {
          id: "primaryImage",
          status: "warn",
          message: "تصویر اصلی تعیین نشده است.",
        },
  ];
  const filled = images.map((image) => altKey(image.alt)).filter(Boolean);
  if (filled.length > 1) {
    const repeated = filled.length - new Set(filled).size;
    checks.push(
      repeated === 0
        ? {
            id: "imageAltRepeated",
            status: "good",
            message: "متن جایگزین هر تصویر متفاوت است.",
          }
        : {
            id: "imageAltRepeated",
            status: "warn",
            message: `متن جایگزین ${fa(repeated + 1)} تصویر تقریباً یکسان است؛ برای هر تصویر توصیف جدا بنویسید.`,
          },
    );
  }
  return checks;
}
