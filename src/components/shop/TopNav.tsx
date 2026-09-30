"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS } from "@/lib/site-content";
import { cn, toPersianDigits } from "@/lib/utils";

import { useCart } from "./cart/CartProvider";
import { CartIcon, SearchIcon, UserIcon } from "./icons";
import { Logo } from "./Logo";
import { type HeaderContact, MobileMenu } from "./MobileMenu";
import { iconButton } from "./styles";

/** لینک فعال: خود مسیر یا زیرمسیرهایش (به‌جز صفحه‌ی اصلی) */
export function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({ contact }: { contact: HeaderContact }) {
  const pathname = usePathname();
  const { count: cartCount, openDrawer } = useCart();

  return (
    <header className="border-b border-hair">
      {/* دسکتاپ */}
      <div className="mx-auto hidden w-full max-w-[1400px] items-center justify-between gap-8 px-11 py-4 md:flex">
        <Logo priority />

        <nav
          aria-label="منوی اصلی"
          className="flex items-center gap-8 text-[15px]"
        >
          {NAV_LINKS.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pb-1.5 transition",
                  active
                    ? "border-brand-strong border-b-2 font-bold text-ink"
                    : "text-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/products"
            aria-label="جستجوی محصولات"
            className={iconButton}
          >
            <SearchIcon size={19} />
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`سبد خرید، ${toPersianDigits(cartCount)} عدد`}
            className={iconButton}
          >
            <CartIcon size={19} />
            {cartCount > 0 ? <CartBadge count={cartCount} /> : null}
          </button>
          <Link href="/account" aria-label="حساب کاربری" className={iconButton}>
            <UserIcon size={19} />
          </Link>
        </div>
      </div>

      {/* موبایل */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 md:hidden">
        <MobileMenu contact={contact} />
        <Logo size={26} />
        <Link href="/cart" aria-label="سبد خرید" className={iconButton}>
          <CartIcon size={18} />
          {cartCount > 0 ? <CartBadge count={cartCount} /> : null}
        </Link>
      </div>
    </header>
  );
}

function CartBadge({ count }: { count: number }) {
  return (
    <span /* در RTL سمت end همان چپ فیزیکی است (مطابق طراحی) */
      className="bg-accent absolute top-[-5px] end-[-5px] flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold text-surface-alt"
    >
      {toPersianDigits(count)}
    </span>
  );
}
