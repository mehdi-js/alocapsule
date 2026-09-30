import Link from "next/link";

import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatToman } from "@/lib/money";
import { toPersianDigits } from "@/lib/utils";
import { setProductActiveAction } from "@/server/actions/product";
import type { ProductListItem } from "@/server/services/product-query.service";

import { ActiveSwitch } from "./ActiveSwitch";
import { ArchivedProductActions } from "./ArchivedProductActions";
import {
  ArchiveProductButton,
  type ArchiveTargets,
} from "./ArchiveProductButton";
import { DuplicateProductButton } from "./DuplicateProductButton";
import { SeoStatusDot } from "./seo/SeoStatusDot";

const UNIT_LABELS = { GRAM: "گرمی", PIECE: "عددی" } as const;

function priceRange(item: ProductListItem): string {
  if (item.pricingMode === "INQUIRY") return "استعلام قیمت";
  if (item.minPrice === null || item.maxPrice === null) return "—";
  if (item.minPrice === item.maxPrice)
    return `${formatToman(item.minPrice)} تومان`;
  return `${formatToman(item.minPrice)} تا ${formatToman(item.maxPrice)} تومان`;
}

export function ProductsTable({
  items,
  targets,
}: {
  items: ProductListItem[];
  targets: ArchiveTargets;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>محصول</TH>
          <TH>دسته‌بندی</TH>
          <TH>نوع</TH>
          <TH>واحد</TH>
          <TH>متغیرها</TH>
          <TH>قیمت</TH>
          <TH>سئو</TH>
          <TH>فعال در سایت</TH>
          <TH>
            <span className="sr-only">عملیات</span>
          </TH>
        </tr>
      </THead>
      <TBody>
        {items.map((item) => (
          <TR key={item.id}>
            <TD>
              <Link
                href={`/admin/products/${item.id}/edit`}
                className="font-medium hover:underline"
              >
                {item.name}
              </Link>
              <div dir="ltr" className="text-start text-xs text-neutral-400">
                {item.slug}
              </div>
            </TD>
            <TD>{item.categoryName}</TD>
            <TD className="whitespace-nowrap">
              <span
                className={
                  item.kind === "SERVICE"
                    ? "rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900"
                    : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                }
              >
                {item.kind === "SERVICE" ? "خدمت" : "کالا"}
              </span>
              {item.pricingMode === "INQUIRY" ? (
                <span className="ms-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                  استعلامی
                </span>
              ) : null}
            </TD>
            <TD>{item.unit ? UNIT_LABELS[item.unit] : "—"}</TD>
            <TD>
              {toPersianDigits(item.variantCount)}
              {item.activeVariantCount < item.variantCount ? (
                <span className="block text-xs text-amber-700">
                  {toPersianDigits(item.variantCount - item.activeVariantCount)}{" "}
                  غیرفعال
                </span>
              ) : null}
            </TD>
            <TD className="whitespace-nowrap">{priceRange(item)}</TD>
            <TD>
              <SeoStatusDot summary={item.seo} />
            </TD>
            <TD>
              {item.archived ? (
                <span className="text-xs text-amber-700">بایگانی‌شده</span>
              ) : (
                <ActiveSwitch
                  key={`${item.id}-${item.isActive}`}
                  initialChecked={item.isActive}
                  label={`فعال بودن ${item.name} در سایت`}
                  activeMessage="محصول در سایت نمایش داده می‌شود."
                  inactiveMessage="محصول از سایت برداشته شد."
                  onToggle={setProductActiveAction.bind(null, item.id)}
                />
              )}
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/admin/products/${item.id}/edit`}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100"
                >
                  ویرایش
                </Link>
                {item.archived ? (
                  <ArchivedProductActions
                    productId={item.id}
                    productName={item.name}
                  />
                ) : (
                  <>
                    <DuplicateProductButton
                      productId={item.id}
                      productName={item.name}
                    />
                    <ArchiveProductButton
                      productId={item.id}
                      productName={item.name}
                      categorySlug={item.categorySlug}
                      targets={targets}
                    />
                  </>
                )}
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
