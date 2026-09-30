import Link from "next/link";

import { formatToman } from "@/lib/money";
import type { ProductCardDto } from "@/server/services/catalog.service";

import { QuickAdd } from "./cart/QuickAdd";
import { MediaImage } from "./Placeholder";
import { ServiceBadge } from "./ServiceBadge";

/** کارت محصول طبق سند طراحی؛ دکمه‌ی + انتخاب سریع متغیر و افزودن به سبد است. */
export function ProductCard({
  product,
  headingLevel = 3,
}: {
  product: ProductCardDto;
  /** سطح عنوان کارت (زیر H1 صفحه‌ی لیست باید h2 باشد تا ترتیب عنوان‌ها نشکند) */
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const href = `/products/${encodeURIComponent(product.slug)}`;

  return (
    <article className="bg-card relative flex flex-col gap-3.5 rounded-[24px] border border-hair p-3.5 pb-4.5 transition hover:border-outline">
      <Link
        href={href}
        className="relative block h-[186px] overflow-hidden rounded-[18px]"
      >
        <MediaImage
          src={product.imageUrl}
          alt={product.imageAlt ?? product.name}
          sizes="(max-width: 767px) 45vw, 320px"
          placeholderSize="640 × 640"
        />
      </Link>

      <div className="absolute top-6 start-6 flex flex-wrap items-center gap-1.5">
        {product.badge ? (
          <span className="bg-accent text-on-accent rounded-full px-2.5 py-1 text-[11px] font-extrabold">
            {product.badge}
          </span>
        ) : null}
        {product.kind === "SERVICE" ? <ServiceBadge /> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Heading className="text-lg font-bold">
          <Link href={href} className="hover:text-brand-strong transition">
            {product.name}
          </Link>
        </Heading>
        {product.shortDescription ? (
          <p className="text-muted line-clamp-2 text-xs leading-[1.8]">
            {product.shortDescription}
          </p>
        ) : null}
      </div>

      <div className="mt-0.5 flex items-center justify-between gap-2.5">
        {product.price === null ? (
          <p className="text-brand-strong text-[15px] font-bold">
            استعلام قیمت
          </p>
        ) : (
          <p className="text-[17px] font-bold">
            {product.hasRange ? (
              <span className="text-muted text-xs font-medium">از </span>
            ) : null}
            {formatToman(product.price)}{" "}
            <span className="text-muted text-xs font-medium">تومان</span>
          </p>
        )}
        {product.pricingMode === "FIXED" && product.variants.length > 0 ? (
          <QuickAdd product={product} />
        ) : null}
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  className = "grid gap-5 grid-cols-2 lg:grid-cols-3",
}: {
  products: ProductCardDto[];
  className?: string;
}) {
  return (
    <div className={className}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} headingLevel={2} />
      ))}
    </div>
  );
}
