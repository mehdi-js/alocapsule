"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV_LINKS } from "@/lib/site-content";
import { phoneHref } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

import { ChevronLeftIcon, CloseIcon, PhoneIcon, SOCIAL_ICONS } from "./icons";
import { Logo } from "./Logo";
import { btnPrimary, iconButton } from "./styles";

/** کمان‌های تزئینی گوشه‌ی منو (echo لوگو) */
function Ornaments() {
  return (
    <svg
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden
      className="pointer-events-none absolute -top-16 -start-20 size-[420px] opacity-60"
    >
      <circle
        cx="210"
        cy="210"
        r="180"
        stroke="#2FA84F"
        strokeWidth="1.3"
        strokeDasharray="300 700"
      />
      <circle
        cx="210"
        cy="210"
        r="140"
        stroke="#C9A876"
        strokeWidth="1"
        strokeDasharray="170 700"
      />
    </svg>
  );
}

export interface HeaderContact {
  phone: string;
  social: {
    key: "instagram" | "telegram" | "whatsapp";
    label: string;
    href: string;
  }[];
}

export function MobileMenu({ contact }: { contact: HeaderContact }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // با تغییر مسیر، منو بسته می‌شود
  useEffect(() => setOpen(false), [pathname]);

  // قفل اسکرول بدنه هنگام باز بودن منو
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="باز کردن منو"
        aria-expanded={open}
        className={cn(iconButton, "flex-col gap-1")}
      >
        <span className="bg-ink h-0.5 w-4 rounded-sm" />
        <span className="bg-ink h-0.5 w-4 rounded-sm" />
        {/* خط سوم کوتاه و طلایی، طبق طراحی */}
        <span className="bg-gold me-[3px] h-0.5 w-2.5 self-end rounded-sm" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="منوی اصلی"
          className="fixed inset-0 z-50 flex animate-[fade_250ms_ease] flex-col overflow-y-auto bg-[#081A11] px-5 pt-4 pb-10"
        >
          <Ornaments />

          <div className="relative flex items-center justify-between">
            <Logo size={26} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن منو"
              className={iconButton}
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <p className="text-gold relative mt-9 text-[13px] font-bold">
            منوی اصلی
          </p>

          <nav className="relative mt-3 flex flex-col">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between border-b border-[rgb(201_168_118/0.14)] py-4 text-[22px] font-bold",
                    active ? "text-action" : "text-ink",
                  )}
                >
                  {link.label}
                  <ChevronLeftIcon size={20} className="text-gold" />
                </Link>
              );
            })}
          </nav>

          <div className="relative mt-auto flex flex-col items-center gap-6 pt-10">
            <Link href="/account" className={cn(btnPrimary, "w-full")}>
              حساب کاربری / ورود
            </Link>
            <div className="flex items-center gap-3">
              {contact.social.map((item) => {
                const SocialIcon = SOCIAL_ICONS[item.key];
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className={cn(iconButton, "text-gold")}
                  >
                    <SocialIcon size={18} />
                  </a>
                );
              })}
            </div>
            <a
              href={phoneHref(contact.phone)}
              className="text-muted flex items-center gap-2 text-sm"
            >
              <PhoneIcon size={15} className="text-gold" />
              {contact.phone}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
