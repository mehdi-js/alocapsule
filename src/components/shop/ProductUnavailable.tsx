import Link from "next/link";

import { btnPrimary, panel } from "./styles";

/**
 * محصول غیرفعال (SEO.md §۴.۳): صفحه زنده می‌ماند ولی دکمه‌ی خرید نیست؛
 * مشتری به دسته و محصولات مرتبط هدایت می‌شود.
 */
export function ProductUnavailable({
  categoryName,
  categorySlug,
}: {
  categoryName: string;
  categorySlug: string;
}) {
  return (
    <div className={`${panel} flex flex-col gap-4 p-5`} role="status">
      <p className="text-lg font-bold">در حال حاضر قابل سفارش نیست</p>
      <p className="text-muted text-sm leading-7">
        این محصول فعلاً برای سفارش آنلاین در دسترس نیست. محصولات مشابه را پایین
        همین صفحه ببینید یا به دسته‌ی {categoryName} سر بزنید.
      </p>
      <button
        type="button"
        disabled
        className={`${btnPrimary} cursor-not-allowed opacity-50`}
      >
        ناموجود
      </button>
      <Link
        href={`/category/${categorySlug}`}
        className="text-brand-strong w-fit text-sm font-bold underline underline-offset-4"
      >
        مشاهده‌ی {categoryName}
      </Link>
    </div>
  );
}
