import type { BannerImages } from "@/lib/banners";
import { cn } from "@/lib/utils";

import { Placeholder } from "./Placeholder";

/**
 * تصویر بنر/اسلاید با دو نسخه: `<picture>` نسخه‌ی موبایل را زیر ۷۶۸ پیکسل و
 * نسخه‌ی دسکتاپ را بالاتر نشان می‌دهد (مرورگر فقط یکی را دانلود می‌کند).
 * بی‌تصویر ⇒ جای‌نگه‌دار با اندازه‌ی پیشنهادی.
 */
export function BannerImage({
  images,
  alt,
  placeholderLabel,
  placeholderSize,
  className,
  placeholderClassName,
  priority = false,
}: {
  images: BannerImages;
  alt: string;
  placeholderLabel: string;
  placeholderSize: string;
  className?: string;
  /** کلاس‌هایی که فقط روی جای‌نگه‌دار (بی‌تصویر) اعمال می‌شوند */
  placeholderClassName?: string;
  /** تصویر بالای صفحه (LCP) زودتر بارگذاری شود */
  priority?: boolean;
}) {
  const desktop = images.desktop ?? images.mobile;
  const mobile = images.mobile ?? images.desktop;
  if (!desktop || !mobile) {
    return (
      <Placeholder
        size={placeholderSize}
        label={placeholderLabel}
        className={cn(className, placeholderClassName)}
      />
    );
  }
  return (
    <picture className={cn("block overflow-hidden", className)}>
      <source media="(min-width: 768px)" srcSet={desktop} />
      {/* تصاویر از قبل WebP و در اندازه‌ی مناسب‌اند؛ بهینه‌سازی next/image لازم نیست */}
      {}
      <img
        src={mobile}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </picture>
  );
}
