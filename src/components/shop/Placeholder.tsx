import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * جای‌نگه‌دار تصویر طبق سند طراحی: کادر خاکستری با حاشیه‌ی خط‌چین و برچسب
 * اندازه‌ی پیشنهادی منبع. تا وقتی کارفرما عکس‌ها را بدهد، همین دیده می‌شود.
 */
export function Placeholder({
  label,
  size,
  className,
  compact = false,
}: {
  /** توضیح فارسی، مثل «عکس محصول» */
  label?: string;
  /** اندازه‌ی پیشنهادی منبع، مثل `640 × 640` */
  size?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-placeholder flex flex-col items-center justify-center gap-1.5 border border-dashed border-control text-center",
        className,
      )}
    >
      {size ? (
        <span
          dir="ltr"
          className={cn(
            "font-mono text-placeholder-ink",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          {size}
        </span>
      ) : null}
      {label ? (
        <span
          className={cn(
            "text-placeholder-ink",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

/**
 * تصویر واقعی محصول در صورت وجود، وگرنه جای‌نگه‌دار. از بهینه‌ساز
 * `next/image` می‌گذرد تا موبایل نسخه‌ی کوچک‌تر (AVIF/WebP) بگیرد
 * (SEO.md §۹)؛ `sizes` را درست بدهید.
 */
export function MediaImage({
  src,
  alt,
  sizes,
  placeholderSize,
  placeholderLabel = "عکس محصول",
  className,
  priority = false,
  compact = false,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  placeholderSize: string;
  placeholderLabel?: string;
  className?: string;
  priority?: boolean;
  compact?: boolean;
}) {
  if (!src) {
    return (
      <Placeholder
        label={placeholderLabel}
        size={placeholderSize}
        compact={compact}
        className={cn("h-full w-full", className)}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
