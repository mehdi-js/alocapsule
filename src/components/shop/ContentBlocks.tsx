import Link from "next/link";
import type { ReactNode } from "react";

import { BANNER_SLOTS, type BannerImages } from "@/lib/banners";
import { cn } from "@/lib/utils";

const PAGE_HERO_SIZE = BANNER_SLOTS.aboutHero.desktop;

import { BannerImage } from "./BannerImage";
import { ClockIcon, MapPinIcon, PhoneIcon } from "./icons";
import { Placeholder } from "./Placeholder";
import { panel } from "./styles";

/** بنر بالای صفحات محتوایی (درباره ما، تماس) */
export function PageHero({
  eyebrow,
  title,
  imageLabel,
  images,
  children,
}: {
  eyebrow: string;
  title: string[];
  imageLabel: string;
  /** تصاویر دسکتاپ/موبایل از «تنظیمات ← بنرها» */
  images: BannerImages;
  children?: ReactNode;
}) {
  return (
    <section className="relative flex min-h-[260px] items-end overflow-hidden rounded-[18px] md:h-[340px] md:items-center">
      <BannerImage
        images={images}
        alt=""
        placeholderSize={PAGE_HERO_SIZE}
        placeholderLabel={imageLabel}
        priority
        className="absolute inset-0 rounded-[18px]"
      />
      <div className="absolute inset-0 hidden bg-scrim-side md:block" />
      <div className="absolute inset-0 bg-scrim-bottom md:hidden" />
      <div className="relative flex max-w-[640px] flex-col gap-4 p-6 md:me-auto md:p-14">
        <p className="text-accent text-[15px]">{eyebrow}</p>
        <h1 className="text-[30px] leading-[1.3] font-extrabold md:text-5xl">
          {title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        {children}
      </div>
    </section>
  );
}

export function SectionTitle({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-5", className)}>
      <h2 id={id} className="shrink-0 text-2xl font-extrabold md:text-[32px]">
        {children}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-accent/20" />
    </div>
  );
}

export function ContentPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(panel, "p-6 md:p-9", className)}>{children}</div>;
}
