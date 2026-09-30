import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { CategoryDto } from "@/server/services/category.service";
import type { ProductListParams } from "@/server/services/product-query.service";

/** فیلتر GET: بدون جاوااسکریپت کار می‌کند و آدرس قابل اشتراک می‌ماند. */
export function ProductFilters({
  params,
  categories,
}: {
  params: ProductListParams;
  categories: CategoryDto[];
}) {
  const hasFilters = params.q || params.categoryId || params.status !== "all";

  return (
    <form
      method="get"
      className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
    >
      <Input
        name="q"
        type="search"
        defaultValue={params.q}
        placeholder="جستجوی نام محصول…"
        aria-label="جستجوی نام محصول"
      />
      <Select
        name="category"
        defaultValue={params.categoryId}
        aria-label="دسته‌بندی"
      >
        <option value="">همه‌ی دسته‌ها</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {"— ".repeat(category.depth)}
            {category.name}
          </option>
        ))}
      </Select>
      <Select name="status" defaultValue={params.status} aria-label="وضعیت">
        <option value="all">همه (بدون بایگانی)</option>
        <option value="active">فعال</option>
        <option value="inactive">غیرفعال</option>
        <option value="archived">بایگانی‌شده</option>
      </Select>
      <div className="flex gap-2">
        <button type="submit" className={buttonClasses("primary")}>
          اعمال
        </button>
        {hasFilters ? (
          <Link href="/admin/products" className={buttonClasses("secondary")}>
            پاک کردن
          </Link>
        ) : null}
      </div>
    </form>
  );
}
