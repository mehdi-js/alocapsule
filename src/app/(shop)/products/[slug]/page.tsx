import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { Accordion } from "@/components/shop/Accordion";
import { Breadcrumb } from "@/components/shop/Breadcrumb";
import { FaqSection } from "@/components/shop/FaqSection";
import { InquiryBox } from "@/components/shop/InquiryBox";
import { PriceTable } from "@/components/shop/PriceTable";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductInfoRow } from "@/components/shop/ProductInfoRow";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { ProductUnavailable } from "@/components/shop/ProductUnavailable";
import { RelatedProducts } from "@/components/shop/RelatedProducts";
import { ServiceBadge } from "@/components/shop/ServiceBadge";
import { ServiceTermsBox } from "@/components/shop/ServiceTermsBox";
import { SizeSwitch } from "@/components/shop/SizeSwitch";
import { TrustTiles } from "@/components/shop/TrustBar";
import { RichText } from "@/components/ui/RichText";
import { applyContentTokens } from "@/lib/content-tokens";
import { formatJalali } from "@/lib/date";
import {
  buildPriceTable,
  buildSizeSwitch,
  parseSelectionParams,
  resolveSelected,
} from "@/lib/option-selection";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  productJsonLd,
} from "@/lib/seo/jsonld";
import { buildProductMetadata } from "@/lib/seo/metadata";
import { safeDecode } from "@/lib/utils";
import { resolveServiceTerms } from "@/lib/validation/product";
import {
  getProductPage,
  getProductShippingInfo,
  listCategoryTableProducts,
  listRelatedProducts,
  type ProductPageDto,
} from "@/server/services/catalog-page.service";
import { getContentTokenValues } from "@/server/services/content-tokens.service";
import {
  getSeoContext,
  getSeoSettings,
} from "@/server/services/seo-settings.service";
import { getMaxQuantityPerItem } from "@/server/services/settings.service";
import { getSiteSettings } from "@/server/services/site-settings.service";
import { getBusinessSettings } from "@/server/services/store-content.service";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * 🔴 پارامتر گزینه (`?valve=persi`) سمت سرور خوانده می‌شود تا HTML اولیه همان
 * ترکیب را نشان دهد (SEO.md §۴.۵)؛ بنابراین صفحه به‌ازای هر درخواست رندر
 * می‌شود. canonical همیشه بدون پارامتر است (`buildProductMetadata`).
 */

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

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const product = await requireProduct(params);
  const query = await searchParams;
  const [
    related,
    maxQuantity,
    { shippingNote },
    context,
    seo,
    business,
    tableProducts,
    tokens,
  ] = await Promise.all([
    listRelatedProducts(product),
    getMaxQuantityPerItem(),
    getSiteSettings(),
    getSeoContext(),
    getSeoSettings(),
    getBusinessSettings(),
    listCategoryTableProducts(product.categoryId),
    getContentTokenValues(),
  ]);
  const shipping = await getProductShippingInfo(business.pickupHours);
  const inquiry = product.pricingMode === "INQUIRY";
  const serviceTerms = resolveServiceTerms(
    product,
    business.serviceDefaultTerms,
  );
  // قیمت هر کیلو با `catalog.showPricePerKg` (برای الو کپسول خاموش)
  const variants = product.variants.map((variant) => ({
    ...variant,
    pricePerKg: business.showPricePerKg ? variant.pricePerKg : null,
  }));

  const selected = resolveSelected(
    variants,
    parseSelectionParams(query, product.options),
    product.options,
  );
  const sizeSwitch = buildSizeSwitch(
    tableProducts,
    product.slug,
    selected?.selection ?? {},
  );
  const priceTable =
    product.options.length > 0 && variants.length > 1
      ? buildPriceTable([
          {
            slug: product.slug,
            name: product.name,
            options: product.options,
            variants: variants.map((variant) => ({
              selection: variant.selection,
              price: variant.price,
            })),
          },
        ])
      : null;
  const priceNote =
    product.kind === "SERVICE"
      ? business.priceIncludesNote
      : business.priceIncludesNoteProducts;
  const priceUpdatedLabel = product.priceUpdatedAt
    ? formatJalali(product.priceUpdatedAt, "YYYY/MM/DD")
    : null;

  const crumbs = [
    { name: "خانه", path: "/" },
    // دسته‌ی noindex در مسیر نمی‌آید (صفحه‌ی ایندکس‌نشده)؛ «محصولات» به‌جایش
    ...(product.categoryNoindex
      ? [{ name: "محصولات", path: "/products" }]
      : product.categoryTrail),
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
      // زمان تحویل از تنظیمات ارسال (توکن)، نه متن ثابت
      content: <p>{applyContentTokens(shippingNote, tokens)}</p>,
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

        {/* ستون تکی با minmax(0,1fr): بدون آن عرض ستون به محتوای ذاتی (جدول قیمت ۴۲۰px) باز می‌شد و کل صفحه‌ی موبایل جابه‌جا می‌شد */}
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-3.5">
              {product.kind === "SERVICE" ? (
                <ServiceBadge className="w-fit" />
              ) : null}
              <h1 className="text-[28px] font-extrabold tracking-[-0.01em] md:text-4xl">
                {product.name}
              </h1>
              {product.shortDescription ? (
                <p className="text-ink-soft max-w-[520px] text-[15px] leading-[2]">
                  {product.shortDescription}
                </p>
              ) : null}
            </div>

            <SizeSwitch items={sizeSwitch.items} suffix={sizeSwitch.suffix} />

            <div aria-hidden className="h-px bg-accent/14" />

            {product.available && serviceTerms ? (
              <ServiceTermsBox terms={serviceTerms} />
            ) : null}

            {product.available && inquiry ? (
              <InquiryBox phone={business.phone} whatsapp={business.whatsapp} />
            ) : product.available ? (
              <ProductPurchase
                key={product.id}
                variants={variants}
                options={product.options}
                initialVariantId={selected?.id}
                isGram={product.unit === "GRAM"}
                maxQuantity={maxQuantity}
                priceUpdatedLabel={priceUpdatedLabel}
                priceNote={priceTable ? null : priceNote}
              />
            ) : (
              <ProductUnavailable
                categoryName={product.categoryName}
                categorySlug={product.categorySlug}
              />
            )}

            {product.available && !inquiry ? (
              <ProductInfoRow items={shipping} />
            ) : null}

            {product.available && priceTable ? (
              <PriceTable
                table={priceTable}
                mode="product"
                caption={`جدول قیمت ${product.name}`}
                note={priceNote}
                updatedLabel={priceUpdatedLabel}
              />
            ) : null}

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
