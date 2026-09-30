import type { Metadata } from "next";
import Link from "next/link";

import { ContentPanel, PageHero } from "@/components/shop/ContentBlocks";
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SOCIAL_ICONS,
} from "@/components/shop/icons";
import { btnOutline, iconButton } from "@/components/shop/styles";
import { RichText } from "@/components/ui/RichText";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { effectiveMeta } from "@/lib/seo/title";
import { phoneHref, socialLinks } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { getBanners } from "@/server/services/banner.service";
import { getFixedPage } from "@/server/services/page.service";
import { getSeoContext } from "@/server/services/seo-settings.service";
import { getSiteSettings } from "@/server/services/site-settings.service";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getFixedPage("contact");
  return buildPageMetadata(await getSeoContext(), {
    title: page?.seoTitle || page?.title || "تماس با ما",
    description:
      effectiveMeta(page?.metaDescription, page?.content) ||
      "راه‌های ارتباط با فروشگاه علی حان: تلفن، ایمیل، آدرس و شبکه‌های اجتماعی.",
    path: "/contact",
    noindex: page?.noindex,
  });
}

const rowClass =
  "bg-card flex items-center gap-4 rounded-[18px] border border-[rgb(201_168_118/0.16)] p-5";

export default async function ContactPage() {
  const [{ contact, social }, banners, page] = await Promise.all([
    getSiteSettings(),
    getBanners(),
    getFixedPage("contact"),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 pt-4 md:pt-5">
      <PageHero
        eyebrow="در خدمت شما هستیم"
        title={["تماس با علی حان"]}
        imageLabel="بنر تماس"
        images={banners.images.contactHero}
      >
        <p className="text-ink-2 text-[15px] leading-[2]">
          برای پیگیری سفارش، سفارش عمده یا هر پرسشی با ما در تماس باشید.
        </p>
      </PageHero>

      {page?.content ? (
        <ContentPanel>
          <RichText
            text={page.content}
            headingLevel={2}
            className="text-ink-2 text-[15px] [&_a]:text-action"
          />
        </ContentPanel>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <a
          href={phoneHref(contact.phone)}
          className={cn(rowClass, "hover:border-[rgb(201_168_118/0.4)]")}
        >
          <span className="bg-panel text-action flex size-12 shrink-0 items-center justify-center rounded-full">
            <PhoneIcon size={20} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-muted text-sm">تلفن</span>
            <span className="text-lg font-bold">{contact.phone}</span>
          </span>
        </a>
        <a
          href={`mailto:${contact.email}`}
          className={cn(rowClass, "hover:border-[rgb(201_168_118/0.4)]")}
        >
          <span className="bg-panel text-action flex size-12 shrink-0 items-center justify-center rounded-full">
            <MailIcon size={20} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-muted text-sm">ایمیل</span>
            <span dir="ltr" className="text-start font-bold">
              {contact.email}
            </span>
          </span>
        </a>
        <div className={rowClass}>
          <span className="bg-panel text-action flex size-12 shrink-0 items-center justify-center rounded-full">
            <MapPinIcon size={20} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-muted text-sm">دفتر مرکزی</span>
            <span className="font-bold leading-[1.8]">{contact.address}</span>
          </span>
        </div>
      </div>

      <ContentPanel className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">
            ما را در شبکه‌های اجتماعی دنبال کنید
          </h2>
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
                  className={cn(iconButton, "text-gold")}
                >
                  <SocialIcon size={18} />
                </a>
              );
            })}
          </div>
        </div>
        <Link href="/branches" className={btnOutline}>
          آدرس شعب
        </Link>
      </ContentPanel>
    </div>
  );
}
