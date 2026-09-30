"use client";

import { useState } from "react";

import type { TitleSettings } from "@/lib/seo/title";
import type { CategoryDto } from "@/server/services/category.service";
import type { ProductImageDto } from "@/server/services/product-image.service";
import type { ProductEditDto } from "@/server/services/product-query.service";

import { ProductForm } from "./ProductForm";
import { ProductImages } from "./ProductImages";

/** صفحه‌ی ویرایش: تصاویر و فرم state مشترک دارند تا تحلیل سئو تصاویر را ببیند */
export function ProductEditView({
  product,
  categories,
  titleSettings,
  siteUrl,
}: {
  product: ProductEditDto;
  categories: CategoryDto[];
  titleSettings: TitleSettings;
  siteUrl: string;
}) {
  const [images, setImages] = useState<ProductImageDto[]>(product.images);
  return (
    <div className="space-y-6">
      <ProductImages
        productId={product.id}
        initialImages={product.images}
        onImagesChange={setImages}
      />
      <ProductForm
        categories={categories}
        product={product}
        images={images}
        titleSettings={titleSettings}
        siteUrl={siteUrl}
      />
    </div>
  );
}
