"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { toPersianDigits } from "@/lib/utils";
import {
  deleteCategoryAction,
  setCategoryActiveAction,
} from "@/server/actions/category";
import type { CategoryListItem } from "@/server/services/category.service";

import { ActiveSwitch } from "./ActiveSwitch";
import { SeoStatusDot } from "./seo/SeoStatusDot";

export function CategoryManager({
  categories,
}: {
  categories: CategoryListItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<CategoryListItem | null>(null);

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(deleting.id);
      setDeleting(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("دسته‌بندی حذف شد و آدرسش ریدایرکت می‌شود.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link href="/admin/categories/new" className={buttonClasses("primary")}>
          دسته‌بندی جدید
        </Link>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="هنوز دسته‌بندی‌ای ثبت نشده است"
          description="برای ساخت محصول، ابتدا حداقل یک دسته‌بندی بسازید."
          action={
            <Link
              href="/admin/categories/new"
              className={buttonClasses("primary")}
            >
              دسته‌بندی جدید
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>نام</TH>
              <TH>نشانی (slug)</TH>
              <TH>محصولات</TH>
              <TH>ترتیب</TH>
              <TH>سئو</TH>
              <TH>فعال</TH>
              <TH>
                <span className="sr-only">عملیات</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {categories.map((category) => (
              <TR key={category.id}>
                <TD>
                  <span
                    style={{
                      paddingInlineStart: `${category.depth * 1.25}rem`,
                    }}
                    className="font-medium"
                  >
                    {category.depth > 0 ? "↳ " : ""}
                    {category.name}
                  </span>
                </TD>
                <TD>
                  <span dir="ltr" className="text-xs text-neutral-500">
                    {category.slug}
                  </span>
                </TD>
                <TD>{toPersianDigits(category.productCount)}</TD>
                <TD>{toPersianDigits(category.sortOrder)}</TD>
                <TD>
                  <SeoStatusDot summary={category.seo} />
                </TD>
                <TD>
                  <ActiveSwitch
                    key={`${category.id}-${category.isActive}`}
                    initialChecked={category.isActive}
                    label={`فعال بودن دسته‌ی ${category.name}`}
                    activeMessage="دسته‌بندی فعال شد."
                    inactiveMessage="دسته‌بندی غیرفعال شد."
                    onToggle={setCategoryActiveAction.bind(null, category.id)}
                  />
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/categories/${category.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100"
                    >
                      ویرایش
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setDeleting(category)}
                    >
                      حذف
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <ConfirmDialog
        open={deleting !== null}
        destructive
        loading={isPending}
        title="حذف دسته‌بندی"
        confirmLabel="حذف"
        description={
          <>
            دسته‌ی «{deleting?.name}» حذف شود؟ فقط دسته‌ی بدون محصول و بدون
            زیردسته حذف می‌شود. آدرس دسته به دسته‌ی والد (یا همه‌ی محصولات)
            ریدایرکت می‌شود.
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
