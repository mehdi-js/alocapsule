import type { ProductCardDto } from "@/server/services/catalog.service";

import { ProductCard } from "./ProductCard";

export function RelatedProducts({ products }: { products: ProductCardDto[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <h2
          id="related-title"
          className="shrink-0 text-2xl font-extrabold md:text-[28px]"
        >
          محصولات مشابه
        </h2>
        <span aria-hidden className="h-px flex-1 bg-accent/20" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
