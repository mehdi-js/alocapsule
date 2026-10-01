import Image from "next/image";
import Link from "next/link";

import { SITE } from "@/lib/site-content";
import { cn } from "@/lib/utils";

/** نشان برند (کپسول گاز؛ فایل رسمی کارفرما) برای جاهای کوچک مثل تصویر پیش‌فرض آیتم منو */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/brand/mark.png"
      alt=""
      width={size}
      height={size}
      aria-hidden
      unoptimized
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/** لوگوی رسمی کارفرما (۹۰۰×۲۸۶)؛ نسبت عرض به ارتفاع */
const LOGO_SRC = "/brand/logo.png";
const LOGO_RATIO = 900 / 286;

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
