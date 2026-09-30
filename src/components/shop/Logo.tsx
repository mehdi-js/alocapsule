import Image from "next/image";
import Link from "next/link";

import { SITE } from "@/lib/site-content";
import { cn } from "@/lib/utils";

/**
 * نشان برند (کپسول گاز، جای‌نگهدار): برای جاهای کوچک مثل تصویر پیش‌فرض
 * آیتم منو. لوگوی کامل (`Logo`) فایل رسمی کارفرماست.
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
      <rect x="13" y="3" width="8" height="4" rx="1.5" fill="currentColor" />
      <rect x="15" y="7" width="4" height="3" fill="currentColor" />
      <rect
        x="8"
        y="10"
        width="18"
        height="21"
        rx="6"
        stroke="currentColor"
        strokeWidth="2.6"
      />
    </svg>
  );
}

/** لوگو (جای‌نگهدار تا فایل نهایی کارفرما)؛ نسبت عرض به ارتفاع */
const LOGO_SRC = "/brand/logo.svg";
const LOGO_RATIO = 507 / 200;

/**
 * لوگوی کامل برند (نام برند + نشان). `size` همان مقیاس نشان قبلی
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
      alt={SITE.name}
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
    <Link
      href={href}
      className={classes}
      aria-label={`${SITE.name} — صفحه اصلی`}
    >
      {content}
    </Link>
  );
}
