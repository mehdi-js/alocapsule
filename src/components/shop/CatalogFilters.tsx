"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  buildCatalogHref,
  type CatalogUrlState,
  hasActiveFilters,
  toggleValue,
} from "@/lib/catalog-url";
import { cn, toPersianDigits } from "@/lib/utils";
import type { FilterOptions } from "@/server/services/catalog.service";

import { CheckIcon } from "./icons";
import { PriceRange } from "./PriceRange";
import { variantPill } from "./styles";

/**
 * نوار فیلتر فروشگاه. همه‌ی فیلترها در query string هستند و سرور فهرست را
 * می‌سازد. کلید «فقط کالاهای موجود» طراحی عمداً ساخته نشده (بخش ۷.۱ سند).
 */
export function CatalogFilters({
  state,
  options,
  basePath = "/products",
  showCategories = true,
}: {
  state: CatalogUrlState;
  options: FilterOptions;
  basePath?: string;
  showCategories?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function apply(changes: Partial<CatalogUrlState>) {
    const href = buildCatalogHref({ ...state, ...changes, page: 1 }, basePath);
    startTransition(() => router.push(href, { scroll: false }));
  }

  const sectionClass =
    "flex flex-col gap-4 border-b border-[rgb(201_168_118/0.14)] pb-6";

  return (
    <div
      aria-busy={isPending}
      className={cn(
        "flex flex-col gap-6 transition",
        isPending && "opacity-70",
      )}
    >
      {showCategories && options.categories.length > 0 ? (
        <fieldset className={sectionClass}>
          <legend className="mb-4 text-base font-bold">دسته‌بندی</legend>
          <ul className="flex flex-col gap-3.5">
            {options.categories.map((category) => {
              const checked = state.categorySlugs.includes(category.slug);
              return (
                <li key={category.id}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-[15px]">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          apply({
                            categorySlugs: toggleValue(
                              state.categorySlugs,
                              category.slug,
                            ),
                          })
                        }
                        className="peer sr-only"
                      />
                      {/* چک‌باکس سفارشی طبق طراحی؛ input اصلی برای صفحه‌خوان و کیبورد می‌ماند */}
                      <span
                        aria-hidden
                        className="bg-card peer-checked:border-action peer-checked:bg-action peer-focus-visible:outline-action flex size-4 items-center justify-center rounded-[5px] border border-[rgb(201_168_118/0.35)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
                      >
                        <CheckIcon size={11} className="text-action-ink" />
                      </span>
                      {category.name}
                    </span>
                    <span className="text-muted text-[13px]">
                      {toPersianDigits(category.productCount)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      {options.packs.length > 0 ? (
        <fieldset className={sectionClass}>
          <legend className="mb-4 text-base font-bold">وزن / تعداد بسته</legend>
          <div className="flex flex-wrap gap-2.5">
            {options.packs.map((pack) => {
              const active = state.packKeys.includes(pack.key);
              return (
                <button
                  key={pack.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    apply({ packKeys: toggleValue(state.packKeys, pack.key) })
                  }
                  className={cn(variantPill(active), "px-4 py-2 text-sm")}
                >
                  {pack.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {options.maxPrice > options.minPrice ? (
        <fieldset className={sectionClass}>
          <legend className="mb-4 text-base font-bold">محدوده قیمت</legend>
          <PriceRange
            // با تغییر فیلتر از بیرون (مثلاً «حذف فیلترها») از نو ساخته شود
            key={`${state.minPrice}-${state.maxPrice}`}
            bounds={{ min: options.minPrice, max: options.maxPrice }}
            value={{ min: state.minPrice, max: state.maxPrice }}
            onCommit={(range) =>
              apply({ minPrice: range.min, maxPrice: range.max })
            }
          />
        </fieldset>
      ) : null}

      <button
        type="button"
        disabled={!hasActiveFilters(state) || isPending}
        onClick={() =>
          apply({
            categorySlugs: [],
            packKeys: [],
            minPrice: null,
            maxPrice: null,
            search: "",
          })
        }
        className="bg-card rounded-full border border-[rgb(201_168_118/0.3)] py-3 text-[15px] font-bold transition hover:border-[rgb(201_168_118/0.55)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        حذف فیلترها
      </button>
    </div>
  );
}
