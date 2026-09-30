import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * نشان برند: کمان‌های دوگانه‌ی سبز (برای جاهای کوچک مثل تصویر پیش‌فرض
 * آیتم منو). لوگوی کامل (`Logo`) فایل رسمی کارفرماست.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden
      focusable="false"
      className="text-action shrink-0"
    >
      <circle
        cx="17"
        cy="17"
        r="13"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="34 70"
        strokeLinecap="round"
        transform="rotate(-40 17 17)"
      />
      <circle
        cx="17"
        cy="17"
        r="8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="18 50"
        strokeLinecap="round"
        transform="rotate(-40 17 17)"
      />
    </svg>
  );
}

/** لوگوی سفید (برای پس‌زمینه‌ی تیره)، بریده‌شده؛ نسبت عرض به ارتفاع */
const LOGO_SRC = "/brand/logo-white.webp";
const LOGO_RATIO = 507 / 200;

/**
 * لوگوی کامل برند (نوشته‌ی «علی حان» + کمان‌ها). `size` همان مقیاس نشان قبلی
 * است؛ ارتفاع لوگو ۱٫۳۵ برابر آن است تا جای قبلی را بگیرد.
 */
export function Logo({
  size = 32,
  href = "/",
  className,
  priority = false,
}: {
  size?: number;
  href?: string | null;
  className?: string;
  /** لوگوی هدر بالای صفحه است؛ زودتر بارگذاری شود */
  priority?: boolean;
}) {
  const height = Math.round(size * 1.35);
  const width = Math.round(height * LOGO_RATIO);
  const content = (
    <Image
      src={LOGO_SRC}
      alt="علی حان"
      width={width}
      height={height}
      priority={priority}
      unoptimized
      className="block h-auto max-w-none"
      style={{ width, height }}
    />
  );
  const classes = cn("flex shrink-0 items-center", className);

  if (href === null) return <span className={classes}>{content}</span>;
  return (
    <Link href={href} className={classes} aria-label="علی حان — صفحه اصلی">
      {content}
    </Link>
  );
}
