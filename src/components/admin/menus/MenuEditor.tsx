"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatTomanWithUnit } from "@/lib/money";
import { toPersianDigits } from "@/lib/utils";
import {
  deleteMenuCategoryAction,
  deleteMenuItemAction,
  reorderMenuCategoriesAction,
  reorderMenuItemsAction,
} from "@/server/actions/menu";
import type {
  MenuCategoryDto,
  MenuItemDto,
} from "@/server/services/menu-query.service";

import { type CategoryEditing, CategoryNameModal } from "./CategoryNameModal";
import { type ItemEditing, MenuItemModal } from "./MenuItemModal";
import { SortableList, SortableRow } from "./sortable";

type Deleting =
  | { kind: "category"; id: string; name: string; count: number }
  | { kind: "item"; id: string; name: string };

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: MenuItemDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="truncate text-xs text-neutral-500">
          {formatTomanWithUnit(item.price)}
          {item.description ? ` · ${item.description}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          ویرایش
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600"
        >
          حذف
        </Button>
      </div>
    </div>
  );
}

/**
 * ویرایشگر منو: دسته‌ها و آیتم‌های هر دسته با drag & drop چیده می‌شوند
 * (ذخیره‌ی خوش‌بینانه؛ در خطا از سرور دوباره خوانده می‌شود).
 */
export function MenuEditor({
  menuId,
  categories: initial,
}: {
  menuId: string;
  categories: MenuCategoryDto[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState(initial);
  const [categoryEditing, setCategoryEditing] =
    useState<CategoryEditing | null>(null);
  const [itemEditing, setItemEditing] = useState<ItemEditing | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [isPending, startTransition] = useTransition();

  // داده‌ی تازه‌ی سرور (پس از هر ذخیره) جایگزین state محلی می‌شود
  useEffect(() => setCategories(initial), [initial]);

  function persist(save: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await save();
      if (!result.ok) {
        toast.error(result.message ?? "ذخیره‌ی ترتیب ناموفق بود.");
        router.refresh();
      }
    });
  }

  function reorderCategories(ordered: MenuCategoryDto[]) {
    setCategories(ordered);
    persist(() =>
      reorderMenuCategoriesAction(
        menuId,
        ordered.map((c) => c.id),
      ),
    );
  }

  function reorderItems(categoryId: string, ordered: MenuItemDto[]) {
    setCategories((current) =>
      current.map((c) => (c.id === categoryId ? { ...c, items: ordered } : c)),
    );
    persist(() =>
      reorderMenuItemsAction(
        categoryId,
        ordered.map((i) => i.id),
      ),
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result =
        deleting.kind === "category"
          ? await deleteMenuCategoryAction(deleting.id)
          : await deleteMenuItemAction(deleting.id);
      if (!result.ok) return toast.error(result.message);
      toast.success(`«${deleting.name}» حذف شد.`);
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="menu-items-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="menu-items-heading" className="text-lg font-bold">
            دسته‌ها و آیتم‌ها
          </h2>
          <p className="text-sm text-neutral-500">
            برای چینش، دستگیره‌ی ⠿ را بکشید (روی گوشی: کمی نگه دارید و بکشید).
          </p>
        </div>
        <Button onClick={() => setCategoryEditing("new")}>دسته‌ی جدید</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="این منو هنوز دسته‌ای ندارد"
          description="اول یک دسته (مثلاً «پیش‌غذا» یا «نوشیدنی‌ها») بسازید، بعد آیتم‌ها را اضافه کنید."
        />
      ) : (
        <SortableList items={categories} onReorder={reorderCategories}>
          <div className="space-y-4">
            {categories.map((category) => (
              <SortableRow
                key={category.id}
                id={category.id}
                label={`دسته‌ی ${category.name}`}
                className="items-start rounded-xl border border-neutral-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <h3 className="font-bold">{category.name}</h3>
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setItemEditing({
                            categoryId: category.id,
                            item: null,
                          })
                        }
                      >
                        + آیتم
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCategoryEditing(category)}
                      >
                        تغییر نام
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() =>
                          setDeleting({
                            kind: "category",
                            id: category.id,
                            name: category.name,
                            count: category.items.length,
                          })
                        }
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                  {category.items.length === 0 ? (
                    <p className="rounded-lg bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-500">
                      آیتمی ندارد (در صفحه‌ی منو نمایش داده نمی‌شود).
                    </p>
                  ) : (
                    <SortableList
                      items={category.items}
                      onReorder={(ordered) =>
                        reorderItems(category.id, ordered)
                      }
                    >
                      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-100">
                        {category.items.map((item) => (
                          <SortableRow
                            key={item.id}
                            id={item.id}
                            label={item.name}
                            className="bg-white px-1 py-2"
                          >
                            <ItemRow
                              item={item}
                              onEdit={() =>
                                setItemEditing({
                                  categoryId: category.id,
                                  item,
                                })
                              }
                              onDelete={() =>
                                setDeleting({
                                  kind: "item",
                                  id: item.id,
                                  name: item.name,
                                })
                              }
                            />
                          </SortableRow>
                        ))}
                      </div>
                    </SortableList>
                  )}
                </div>
              </SortableRow>
            ))}
          </div>
        </SortableList>
      )}

      <CategoryNameModal
        menuId={menuId}
        editing={categoryEditing}
        onClose={() => setCategoryEditing(null)}
      />
      <MenuItemModal
        menuId={menuId}
        editing={itemEditing}
        categories={categories.map(({ id, name }) => ({ id, name }))}
        onClose={() => setItemEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="حذف"
        description={
          deleting?.kind === "category"
            ? `دسته‌ی «${deleting.name}» و ${toPersianDigits(deleting.count)} آیتم آن حذف شود؟`
            : `آیتم «${deleting?.name ?? ""}» حذف شود؟`
        }
        confirmLabel="حذف"
        destructive
        loading={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}
