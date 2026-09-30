import Link from "next/link";

import { formatToman } from "@/lib/money";
import type { ProductCardDto } from "@/server/services/catalog.service";

import { QuickAdd } from "./cart/QuickAdd";
import { MediaImage } from "./Placeholder";

/** کارت محصول طبق سند طراحی؛ دکمه‌ی + انتخاب سریع متغیر و افزودن به سبد است. */
export function ProductCard({ product }: { product: ProductCardDto }) {
  const href = `/products/${encodeURIComponent(product.slug)}`;

  return (
    <article className="bg-card relative flex flex-col gap-3.5 rounded-[24px] border border-[rgb(201_168_118/0.16)] p-3.5 pb-4.5 transition hover:border-[rgb(201_168_118/0.35)]">
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

      {product.badge ? (
        <span className="bg-gold absolute top-6 start-6 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-canvas">
          {product.badge}
        </span>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold">
          <Link href={href} className="hover:text-action transition">
            {product.name}
          </Link>
        </h3>
        {product.shortDescription ? (
          <p className="text-muted line-clamp-2 text-xs leading-[1.8]">
            {product.shortDescription}
          </p>
        ) : null}
      </div>

      <div className="mt-0.5 flex items-center justify-between gap-2.5">
        <p className="text-[17px] font-bold">
          {product.hasRange ? (
            <span className="text-muted text-xs font-medium">از </span>
          ) : null}
          {formatToman(product.price)}{" "}
          <span className="text-muted text-xs font-medium">تومان</span>
        </p>
        <QuickAdd product={product} />
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
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
