import Link from "next/link";
import type { ReactNode } from "react";

import { BANNER_SLOTS, type BannerImages } from "@/lib/banners";
import { formatOpeningHours } from "@/lib/branch-hours";
import { cn } from "@/lib/utils";
import { listActiveBranches } from "@/server/services/branch.service";

const PAGE_HERO_SIZE = BANNER_SLOTS.aboutHero.desktop;

import { BannerImage } from "./BannerImage";
import { ClockIcon, MapPinIcon, PhoneIcon } from "./icons";
import { Placeholder } from "./Placeholder";
import { panel } from "./styles";

/** بنر بالای صفحات محتوایی (درباره ما، شعب، تماس) */
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
      <div className="absolute inset-0 hidden bg-[linear-gradient(270deg,rgba(7,16,9,.97)_6%,rgba(7,16,9,.86)_34%,rgba(7,16,9,.1)_66%)] md:block" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,16,9,.97)_12%,rgba(7,16,9,.7)_46%,transparent_78%)] md:hidden" />
      <div className="relative flex max-w-[640px] flex-col gap-4 p-6 md:me-auto md:p-14">
        <p className="text-gold text-[15px]">{eyebrow}</p>
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

/** کارت شعب فعال (از جدول Branch)؛ هر کارت به صفحه‌ی آن شعبه لینک دارد */
export async function BranchCards() {
  const branches = await listActiveBranches();
  if (branches.length === 0) {
    return (
      <p className="text-muted text-sm">اطلاعات شعب به‌زودی اضافه می‌شود.</p>
    );
  }
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {branches.map((branch) => (
        <li
          key={branch.id}
          className="bg-card flex flex-col gap-4 rounded-[24px] border border-[rgb(201_168_118/0.16)] p-3.5 pb-5"
        >
          <Placeholder
            size="600 × 400"
            label={branch.name}
            className="h-[180px] rounded-[18px]"
          />
          <div className="flex flex-col gap-3 px-1.5">
            <h3 className="text-lg font-bold">
              <Link
                href={`/branches/${branch.slug}`}
                className="hover:text-action transition"
              >
                {branch.name}
              </Link>
            </h3>
            <p className="text-muted flex items-start gap-2 text-sm leading-[1.9]">
              <MapPinIcon size={15} className="text-gold mt-1 shrink-0" />
              {branch.address}
            </p>
            <p className="text-muted flex items-center gap-2 text-sm">
              <PhoneIcon size={15} className="text-gold shrink-0" />
              <span dir="ltr">{branch.phone}</span>
            </p>
            {formatOpeningHours(branch.openingHours).map((line) => (
              <p
                key={line}
                className="text-action flex items-center gap-2 text-sm"
              >
                <ClockIcon size={15} className="shrink-0" />
                {line}
              </p>
            ))}
            <Link
              href={`/branches/${branch.slug}`}
              className="text-gold w-fit text-sm font-bold underline underline-offset-4"
            >
              جزئیات و مسیریابی
            </Link>
          </div>
        </li>
      ))}
    </ul>
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
      <span aria-hidden className="h-px flex-1 bg-[rgb(201_168_118/0.2)]" />
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
