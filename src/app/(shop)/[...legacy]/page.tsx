import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumb } from "@/components/shop/Breadcrumb";
import { FaqSection } from "@/components/shop/FaqSection";
import { RichText } from "@/components/ui/RichText";
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { effectiveMeta } from "@/lib/seo/title";
import { safeDecode } from "@/lib/utils";
import { getPublishedPage } from "@/server/services/page.service";
import { recordNotFound } from "@/server/services/redirect.service";
import { getSeoContext } from "@/server/services/seo-settings.service";

/**
 * کم‌اولویت‌ترین مسیر (SEO.md §۱۱.۱): صفحات ثابت منتشرشده (`/faq`،
 * `/shipping`، …) با نامک یک‌بخشی؛ نامک قدیمی صفحه ⇒ 308. هر چیز دیگر ⇒ ثبت
 * در لاگ ۴۰۴ و ۴۰۴ واقعی. ریدایرکت‌های جدول و قواعد وردپرس (و 410) قبل از
 * رسیدن به اینجا در middleware اعمال شده‌اند.
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ legacy: string[] }>;

async function lookup(params: Params) {
  const { legacy } = await params;
  if (legacy.length !== 1) return { kind: "missing" as const, legacy };
  const result = await getPublishedPage(safeDecode(legacy[0]!));
  return { ...result, legacy };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const result = await lookup(params);
  if (result.kind !== "found") return {};
  const page = result.data;
  return buildPageMetadata(await getSeoContext(), {
    title: page.seoTitle || page.title,
    description: effectiveMeta(page.metaDescription, page.content) || null,
    path: `/${page.slug}`,
    noindex: page.noindex,
  });
}

export default async function LegacyOrPage({ params }: { params: Params }) {
  const result = await lookup(params);
  if (result.kind === "redirect") permanentRedirect(result.to);
  if (result.kind === "missing") {
    const referrer = (await headers()).get("referer");
    await recordNotFound(`/${result.legacy.join("/")}`, referrer);
    notFound();
  }

  const page = result.data;
  const context = await getSeoContext();
  const crumbs = [
    { name: "خانه", path: "/" },
    { name: page.title, path: `/${page.slug}` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 px-5 pt-6 md:pt-8">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, context.siteUrl),
          faqPageJsonLd(page.faq),
        ]}
      />
      <Breadcrumb
        items={[{ label: "خانه", href: "/" }, { label: page.title }]}
      />
      <h1 className="text-[28px] font-extrabold md:text-4xl">{page.title}</h1>
      <RichText
        text={page.content}
        headingLevel={2}
        className="text-ink-2 text-[15px] [&_a]:text-action"
      />
      <FaqSection items={page.faq} id="page-faq" />
    </div>
  );
}
