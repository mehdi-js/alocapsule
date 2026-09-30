"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account/orders", label: "سفارش‌ها" },
  { href: "/account/addresses", label: "آدرس‌ها" },
  { href: "/account/wallet", label: "کیف پول" },
  { href: "/account/profile", label: "پروفایل" },
] as const;

/** تب‌های پنل کاربر (موبایل: اسکرول افقی) */
export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="پنل کاربر"
      className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0"
    >
      <ul className="flex min-w-max gap-2">
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full border px-5 py-2.5 text-sm transition",
                  active
                    ? "border-brand-strong bg-brand-strong text-on-brand font-bold"
                    : "text-ink-soft border-control hover:border-strong",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
