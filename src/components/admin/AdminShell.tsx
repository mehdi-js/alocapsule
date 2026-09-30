"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { SITE } from "@/lib/site-content";
import { cn, toPersianDigits } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/payments", label: "پرداخت‌ها" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/notifications", label: "پیامک‌ها" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/settings", label: "تنظیمات" },
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/categories", label: "دسته‌بندی‌ها" },
  { href: "/admin/coupons", label: "کدهای تخفیف" },
  { href: "/admin/menus", label: "منوی شعبه‌ها" },
  { href: "/admin/pages", label: "صفحات" },
  { href: "/admin/redirects", label: "ریدایرکت‌ها" },
  { href: "/admin/not-found", label: "خطاهای ۴۰۴" },
];

/** سایدبار (دسکتاپ) / کشو (موبایل) + هدر بالا + محتوا */
export function AdminShell({
  userPhone,
  logoutAction,
  maintenance,
  children,
}: {
  userPhone: string;
  logoutAction: () => Promise<void>;
  /** حالت بروزرسانی سایت فعال است */
  maintenance: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <nav aria-label="منوی مدیریت" className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        // «داشبورد» فقط خود /admin؛ بقیه هر زیرمسیر
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 md:flex">
      <aside className="hidden w-60 shrink-0 border-e border-neutral-200 bg-white md:block">
        <div className="border-b border-neutral-200 px-5 py-4 text-lg font-bold">
          {SITE.name}
        </div>
        {nav}
      </aside>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="منو"
        >
          <button
            type="button"
            aria-label="بستن منو"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-64 bg-white shadow-xl">
            <div className="border-b border-neutral-200 px-5 py-4 text-lg font-bold">
              {SITE.name}
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        {maintenance ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950 md:px-8"
          >
            <span>
              حالت بروزرسانی فعال است؛ سایت برای بازدیدکنندگان بسته است (منوی
              شعبه‌ها باز است).
            </span>
            <Link
              href="/admin/settings"
              className="underline underline-offset-4"
            >
              تنظیمات
            </Link>
          </div>
        ) : null}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="باز کردن منو"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm md:hidden"
          >
            منو
          </button>
          <span className="hidden text-sm text-neutral-500 md:inline">
            پنل مدیریت
          </span>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/"
              className="text-neutral-600 underline underline-offset-4"
            >
              مشاهده‌ی سایت
            </Link>
            <span dir="ltr" className="hidden text-neutral-500 sm:inline">
              {toPersianDigits(userPhone)}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
              >
                خروج
              </button>
            </form>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
