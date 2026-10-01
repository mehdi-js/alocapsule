import Link from "next/link";

import { enamadUrls } from "@/lib/enamad";
import { NAV_LINKS, SITE } from "@/lib/site-content";
import { phoneHref, socialLinks } from "@/lib/site-settings";
import { cn, toPersianDigits } from "@/lib/utils";
import { getFooterCategories } from "@/server/services/catalog-page.service";
import { listPublishedPages } from "@/server/services/page.service";
import { getSiteSettings } from "@/server/services/site-settings.service";
import { getBusinessSettings } from "@/server/services/store-content.service";

import { MailIcon, MapPinIcon, PhoneIcon, SOCIAL_ICONS } from "./icons";
import { Logo } from "./Logo";
import { iconButton } from "./styles";

/**
 * فوتر. بخش «عضویت در خبرنامه» طراحی ساخته نشده است (بدون مدل داده و خارج از
 * دامنه‌ی نسخه ۱)؛ ستون‌ها به سه ستون تنظیم شده‌اند.
 */
export async function Footer() {
  const [{ contact, social, enamad }, categories, pages, business] =
    await Promise.all([
      getSiteSettings(),
      getFooterCategories(),
      listPublishedPages(),
      getBusinessSettings(),
    ]);
  // صفحات اعتماد منتشرشده (سوالات متداول، ارسال، مرجوعی، …)
  const infoLinks = pages
    .filter((page) => page.slug !== "about" && page.slug !== "contact")
    .map((page) => ({ href: `/${page.slug}`, label: page.title }));
  const seal = enamad ? enamadUrls(enamad) : null;
  return (
    <footer className="bg-ink text-on-media mt-12 px-5 pt-12 pb-6 lg:px-11">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr]">
          <div className="flex flex-col gap-4">
            {/* لوگوی رسمی (آبی/نارنجی) روی زمینه‌ی تیره‌ی فوتر خوانا نیست؛ روی کاشی روشن */}
            <Logo className="w-fit rounded-2xl bg-white px-4 py-2.5" />
            <p className="text-on-media/75 text-sm">{SITE.tagline}</p>
            <div className="flex items-center gap-3">
              {socialLinks(social).map((item) => {
                const SocialIcon = SOCIAL_ICONS[item.key];
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className={cn(
                      iconButton,
                      "text-on-media border-on-media/25 hover:border-on-media/60 bg-transparent",
                    )}
                  >
                    <SocialIcon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          <nav aria-label="دسترسی سریع" className="flex flex-col gap-3">
            <h2 className="text-brand text-[15px] font-bold">دسترسی سریع</h2>
            {[...NAV_LINKS, ...infoLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-on-media/75 hover:text-on-media w-fit text-sm transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {categories.length > 0 ? (
            <nav aria-label="دسته‌بندی‌ها" className="flex flex-col gap-3">
              <h2 className="text-brand text-[15px] font-bold">دسته‌بندی‌ها</h2>
              {categories.map((category) => (
                <Link
                  key={category.path}
                  href={category.path}
                  className="text-on-media/75 hover:text-on-media w-fit text-sm transition"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className="flex flex-col gap-3">
            <h2 className="text-brand text-[15px] font-bold">اطلاعات تماس</h2>
            <a
              href={phoneHref(business.phone)}
              className="text-on-media/75 hover:text-on-media flex w-fit items-center gap-2.5 text-sm transition"
            >
              <PhoneIcon size={15} className="text-brand shrink-0" />
              <span dir="ltr">{toPersianDigits(business.phone)}</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="text-on-media/75 hover:text-on-media flex w-fit items-center gap-2.5 text-sm transition"
            >
              <MailIcon size={15} className="text-brand shrink-0" />
              <span dir="ltr">{contact.email}</span>
            </a>
            <p className="text-on-media/75 flex items-start gap-2.5 text-sm leading-[1.8]">
              <MapPinIcon size={15} className="text-brand mt-1.5 shrink-0" />
              {contact.address}
            </p>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-on-media/15 pt-4.5">
          <p className="text-on-media/65 text-[13px]">
            © {toPersianDigits(new Date().getFullYear())} {SITE.name}. تمامی
            حقوق محفوظ است.
          </p>
          {seal ? (
            // لینک و تصویر مستقیم از اینماد با referrer «origin» (شرط اعتبارسنجی اینماد)
            <a
              href={seal.page}
              target="_blank"
              rel="noopener"
              referrerPolicy="origin"
              aria-label="نماد اعتماد الکترونیکی (اینماد)"
              className="rounded-xl bg-white p-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={seal.logo}
                alt="نماد اعتماد الکترونیکی"
                referrerPolicy="origin"
                width={80}
                height={80}
                loading="lazy"
                className="h-20 w-20 object-contain"
              />
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
