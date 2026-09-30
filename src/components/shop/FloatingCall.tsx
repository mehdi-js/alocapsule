"use client";

import { usePathname } from "next/navigation";

import { phoneHref } from "@/lib/site-settings";

import { PhoneIcon } from "./icons";

/**
 * دکمه‌ی شناور تماس (فقط موبایل). صفحه‌ی محصول، سبد و تسویه نوار چسبان
 * خودشان را دارند و دکمه در آن‌ها نمی‌آید.
 */
export function FloatingCall({ phone }: { phone: string }) {
  const pathname = usePathname();
  if (/^\/(products\/[^/]+|cart|checkout)/.test(pathname)) return null;
  return (
    <a
      href={phoneHref(phone)}
      aria-label="تماس تلفنی"
      className="bg-brand-strong text-on-brand fixed end-4 bottom-24 z-30 flex size-14 items-center justify-center rounded-full shadow-lg transition hover:bg-brand-strong-hover md:hidden"
    >
      <PhoneIcon size={24} />
    </a>
  );
}
