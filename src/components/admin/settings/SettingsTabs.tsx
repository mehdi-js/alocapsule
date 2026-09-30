"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/settings", label: "عمومی" },
  { href: "/admin/settings/bank-cards", label: "کارت‌های بانکی" },
  { href: "/admin/settings/shipping", label: "روش‌های ارسال" },
  { href: "/admin/settings/branches", label: "شعب" },
  { href: "/admin/settings/banners", label: "بنرها و اسلایدر" },
  { href: "/admin/settings/seo", label: "سئو" },
  { href: "/admin/notifications/settings", label: "پیامک‌ها" },
  { href: "/admin/settings/server", label: "اتصال‌ها و سرور" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="بخش‌های تنظیمات" className="mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin/settings"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              active
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white hover:bg-neutral-50",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
