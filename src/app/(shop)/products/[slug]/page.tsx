import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { Accordion } from "@/components/shop/Accordion";
import { Breadcrumb } from "@/components/shop/Breadcrumb";
import { FaqSection } from "@/components/shop/FaqSection";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { ProductUnavailable } from "@/components/shop/ProductUnavailable";
import { RelatedProducts } from "@/components/shop/RelatedProducts";
import { TrustTiles } from "@/components/shop/TrustBar";
import { RichText } from "@/components/ui/RichText";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  productJsonLd,
} from "@/lib/seo/jsonld";
import { buildProductMetadata } from "@/lib/seo/metadata";
import { safeDecode } from "@/lib/utils";
import {
  getProductPage,
  listRelatedProducts,
  type ProductPageDto,
} from "@/server/services/catalog-page.service";
import {
  getSeoContext,
  getSeoSettings,
} from "@/server/services/seo-settings.service";
import { getMaxQuantityPerItem } from "@/server/services/settings.service";
import { getSiteSettings } from "@/server/services/site-settings.service";

type Params = Promise<{ slug: string }>;

/** صفحه‌ها در اولین درخواست ساخته و کش می‌شوند (ISR)؛ تغییر در ادمین فوراً revalidate می‌کند. */
export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

const loadProduct = cache(async (params: Params) => {
  const { slug } = await params;
  return getProductPage(safeDecode(slug));
});

/** نامک قدیمی یا محصول بایگانی ⇒ ریدایرکت دائمی (308)؛ نبود ⇒ ۴۰۴ واقعی */
async function requireProduct(params: Params): Promise<ProductPageDto> {
  const lookup = await loadProduct(params);
  if (lookup.kind === "redirect") permanentRedirect(lookup.to);
  if (lookup.kind === "missing") notFound();
  return lookup.data;
}

/** تصویر OG: برش ۱۲۰۰×۶۳۰ تصویر اصلی؛ تصویر قدیمی بدون برش ⇒ خودش */
function ogImage(product: ProductPageDto) {
  const image = product.images[0];
  if (!image) return null;
  return image.ogUrl
    ? { url: image.ogUrl, width: 1200, height: 630, alt: image.alt }
    : {
        url: image.url,
        width: image.width,
        height: image.height,
        alt: image.alt,
      };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const lookup = await loadProduct(params);
  if (lookup.kind !== "found") return {};
  const product = lookup.data;
  return buildProductMetadata(await getSeoContext(), {
    ...product,
    image: ogImage(product),
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = await requireProduct(params);
  const [related, maxQuantity, { shippingNote }, context, seo] =
    await Promise.all([
      listRelatedProducts(product),
      getMaxQuantityPerItem(),
      getSiteSettings(),
      getSeoContext(),
      getSeoSettings(),
    ]);

  const crumbs = [
    { name: "خانه", path: "/" },
    ...product.categoryTrail,
    { name: product.name, path: `/products/${product.slug}` },
  ];

  const accordionItems = [
    ...(product.description
      ? [
          {
            id: "description",
            title: "توضیحات محصول",
            // قالب lib/rich-text (لینک، فهرست، سرتیتر)؛ HTML خام رندر نمی‌شود
            content: <RichText text={product.description} headingLevel={3} />,
          },
        ]
      : []),
    {
      id: "shipping",
      title: "ارسال و نگهداری",
      content: <p>{shippingNote}</p>,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-5 pt-6 md:gap-16 md:px-11 md:pt-8">
      <JsonLd
        data={[
          productJsonLd({
            siteUrl: context.siteUrl,
            brandName: seo.brandName,
            name: product.name,
            slug: product.slug,
            description: product.description ?? product.shortDescription,
            categoryName: product.categoryName,
            images: product.images.map((image) => image.url),
            variants: product.schemaVariants,
            available: product.available,
          }),
          breadcrumbJsonLd(crumbs, context.siteUrl),
          faqPageJsonLd(product.faq),
        ]}
      />

      <div className="flex flex-col gap-6">
        <Breadcrumb
          items={crumbs.map((crumb, index) => ({
            label: crumb.name,
            href: index < crumbs.length - 1 ? crumb.path : undefined,
          }))}
        />

        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3.5">
              <h1 className="text-[28px] font-extrabold tracking-[-0.01em] md:text-4xl">
                {product.name}
              </h1>
              {product.shortDescription ? (
                <p className="text-ink-soft max-w-[520px] text-[15px] leading-[2]">
                  {product.shortDescription}
                </p>
              ) : null}
            </div>

            <div aria-hidden className="h-px bg-accent/14" />

            {product.available ? (
              <ProductPurchase
                variants={product.variants}
                isGram={product.unit === "GRAM"}
                maxQuantity={maxQuantity}
              />
            ) : (
              <ProductUnavailable
                categoryName={product.categoryName}
                categorySlug={product.categorySlug}
              />
            )}

            <TrustTiles />
            <Accordion items={accordionItems} />
          </div>
        </div>
      </div>

      <FaqSection items={product.faq} id="product-faq" />
      <RelatedProducts products={related} />
    </div>
  );
}
