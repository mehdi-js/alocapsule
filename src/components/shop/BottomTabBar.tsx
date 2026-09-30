"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn, toPersianDigits } from "@/lib/utils";

import { useCart } from "./cart/CartProvider";
import { BagIcon, CartIcon, HomeIcon, UserIcon } from "./icons";
import { isActiveLink } from "./TopNav";

/**
 * نوار تب پایین (فقط موبایل). تب «علاقه‌مندی» طراحی حذف شده (بدون مدل داده)
 * و جایش «سبد خرید» آمده است.
 */
const TABS = [
  { href: "/", label: "خانه", Icon: HomeIcon },
  { href: "/products", label: "فروشگاه", Icon: BagIcon },
  { href: "/cart", label: "سبد خرید", Icon: CartIcon },
  { href: "/account", label: "حساب من", Icon: UserIcon },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const { count: cartCount } = useCart();

  // صفحه‌ی محصول نوار چسبان «افزودن به سبد» خودش را دارد (طبق طراحی)
  if (/^\/products\/[^/]+/.test(pathname)) return null;

  return (
    <nav
      aria-label="ناوبری پایین"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-hair bg-[#09160E] px-4 pt-2.5 pb-[max(1.625rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = isActiveLink(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1.5",
              active ? "text-brand-strong" : "text-muted",
            )}
          >
            <Icon size={21} />
            {href === "/cart" && cartCount > 0 ? (
              <span className="bg-accent absolute top-0 end-[calc(50%-20px)] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-surface-alt">
                {toPersianDigits(cartCount)}
              </span>
            ) : null}
            <span className={cn("text-[10px]", active && "font-bold")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
