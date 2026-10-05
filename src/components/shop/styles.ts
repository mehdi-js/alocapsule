import { cn } from "@/lib/utils";

/** کلاس‌های مشترک فروشگاه — مقادیر از سند طراحی گرفته شده‌اند. */

/** دکمه‌ی اصلی: پس‌زمینه‌ی action با متن تیره */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-strong px-7 py-3.5 text-[15px] font-extrabold text-on-brand transition hover:bg-brand-strong-hover disabled:cursor-not-allowed disabled:opacity-60";

/**
 * دکمه‌ی اصلی فشرده (نوار چسبان موبایل، افزودن سریع). `cn` کلاس‌های متناقض را
 * ادغام نمی‌کند: `cn(btnPrimary, "px-3")` هم `px-7` و هم `px-3` را می‌ریخت و
 * دکمه از عرض نوار بیرون می‌زد؛ پس برای دکمه‌ی کوچک از این استفاده شود.
 */
export const btnPrimaryCompact =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-strong px-3 text-sm font-extrabold whitespace-nowrap text-on-brand transition hover:bg-brand-strong-hover disabled:cursor-not-allowed disabled:opacity-60";

/** دکمه‌ی CTA روی عکس (تیره‌تر، برای خوانایی روی تصویر) */
export const btnDeep =
  "inline-flex items-center gap-3 rounded-full bg-brand-deep py-2.5 pe-3 ps-7 text-[15px] font-bold text-on-brand shadow-[0_20px_44px_-24px_color-mix(in_srgb,var(--color-brand)_80%,transparent)] transition hover:bg-brand-deep-hover";

/** دکمه‌ی ثانویه: شفاف با حاشیه‌ی طلایی */
export const btnOutline =
  "inline-flex items-center justify-center gap-2.5 rounded-full border border-outline px-6 py-3 text-[15px] font-bold text-ink transition hover:bg-card";

/** دکمه‌ی گرد آیکونی در هدر و گالری */
export const iconButton =
  "relative flex size-[42px] items-center justify-center rounded-full border border-control bg-card text-ink transition hover:border-strong";

/** پنل بخش‌ها: گوشه‌ی متوسط و حاشیه‌ی ملایم */
export const panel =
  "rounded-2xl border border-hair bg-panel shadow-[0_1px_2px_rgba(28,25,23,0.04)]";

/** خط مویی طلایی */
export const hairline = "border-hair";

/** قرص انتخاب متغیر */
export function variantPill(active: boolean): string {
  return cn(
    "rounded-full border px-5 py-3 text-[15px] transition",
    active
      ? "border-brand-strong bg-brand-strong font-bold text-on-brand"
      : "border-control text-ink-soft hover:border-strong",
  );
}

/** گاتر افقی صفحه (۴۴px دسکتاپ · ۲۰px موبایل) */
export const pageGutter = "px-5 lg:px-11";

/** پهنای بیشینه‌ی محتوا */
export const contentWidth = "mx-auto w-full max-w-[1400px]";

/** فیلد فرم فروشگاه (تیره، حاشیه‌ی طلایی؛ خطا ⇒ حاشیه‌ی قرمز) */
export const shopInput =
  "w-full rounded-[14px] border border-control bg-card px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-strong aria-[invalid=true]:border-danger";

/** کارت قابل انتخاب (آدرس، روش ارسال) */
export function choiceCard(active: boolean): string {
  return cn(
    "flex cursor-pointer gap-3 rounded-[18px] border p-4 transition",
    active
      ? "border-brand-strong bg-brand-soft"
      : "border-control bg-card hover:border-outline",
  );
}
