import { cn } from "@/lib/utils";

/** کلاس‌های مشترک فروشگاه — مقادیر از سند طراحی گرفته شده‌اند. */

/** دکمه‌ی اصلی: پس‌زمینه‌ی action با متن تیره */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-action px-7 py-3.5 text-[15px] font-extrabold text-action-ink transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60";

/** دکمه‌ی CTA روی عکس (تیره‌تر، برای خوانایی روی تصویر) */
export const btnDeep =
  "inline-flex items-center gap-3 rounded-full bg-action-deep py-2.5 pe-3 ps-7 text-[15px] font-bold text-ink shadow-[0_20px_44px_-24px_rgba(47,168,79,.8)] transition hover:bg-action-deep-hover";

/** دکمه‌ی ثانویه: شفاف با حاشیه‌ی طلایی */
export const btnOutline =
  "inline-flex items-center justify-center gap-2.5 rounded-full border border-[rgb(201_168_118/0.45)] px-6 py-3 text-[15px] font-bold text-ink transition hover:bg-card";

/** دکمه‌ی گرد آیکونی در هدر و گالری */
export const iconButton =
  "relative flex size-[42px] items-center justify-center rounded-full border border-[rgb(201_168_118/0.2)] bg-card text-ink transition hover:border-[rgb(201_168_118/0.55)]";

/** دکمه‌ی گرد کنترل کاروسل روی عکس */
export const carouselButton =
  "flex size-10 items-center justify-center rounded-full border border-[rgb(245_240_232/0.28)] text-ink transition hover:bg-[rgb(245_240_232/0.12)]";

/** پنل بخش‌ها */
export const panel =
  "rounded-[22px] border border-[rgb(201_168_118/0.14)] bg-panel";

/** خط مویی طلایی */
export const hairline = "border-[rgb(201_168_118/0.14)]";

/** قرص انتخاب متغیر */
export function variantPill(active: boolean): string {
  return cn(
    "rounded-full border px-5 py-3 text-[15px] transition",
    active
      ? "border-action bg-action font-bold text-action-ink"
      : "border-[rgb(201_168_118/0.3)] text-ink-2 hover:border-[rgb(201_168_118/0.55)]",
  );
}

/** گاتر افقی صفحه (۴۴px دسکتاپ · ۲۰px موبایل) */
export const pageGutter = "px-5 lg:px-11";

/** پهنای بیشینه‌ی محتوا */
export const contentWidth = "mx-auto w-full max-w-[1400px]";

/** فیلد فرم فروشگاه (تیره، حاشیه‌ی طلایی؛ خطا ⇒ حاشیه‌ی قرمز) */
export const shopInput =
  "w-full rounded-[14px] border border-[rgb(201_168_118/0.22)] bg-card px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-[rgb(201_168_118/0.55)] aria-[invalid=true]:border-danger";

/** کارت قابل انتخاب (آدرس، روش ارسال) */
export function choiceCard(active: boolean): string {
  return cn(
    "flex cursor-pointer gap-3 rounded-[18px] border p-4 transition",
    active
      ? "border-action bg-[rgb(47_168_79/0.08)]"
      : "border-[rgb(201_168_118/0.18)] bg-card hover:border-[rgb(201_168_118/0.45)]",
  );
}
