"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IMAGE_MIME_TYPES } from "@/lib/image/config";
import { parseIntegerInput, toPersianDigits } from "@/lib/utils";
import {
  removeMenuItemImageAction,
  saveMenuItemAction,
} from "@/server/actions/menu";
import type { MenuItemDto } from "@/server/services/menu-query.service";

export interface ItemEditing {
  categoryId: string;
  item: MenuItemDto | null;
}

async function uploadImage(itemId: string, file: File) {
  const body = new FormData();
  body.set("itemId", itemId);
  body.set("file", file);
  const response = await fetch("/api/upload/menu-image", {
    method: "POST",
    body,
  });
  const result = (await response.json().catch(() => null)) as {
    ok: boolean;
    message?: string;
  } | null;
  if (!result?.ok)
    throw new Error(result?.message ?? "آپلود تصویر ناموفق بود.");
}

function ItemForm({
  menuId,
  editing,
  categories,
  onClose,
}: {
  menuId: string;
  editing: ItemEditing;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const { item } = editing;
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(
    item ? toPersianDigits(item.price.toLocaleString("en-US")) : "",
  );
  const [categoryId, setCategoryId] = useState(editing.categoryId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(item?.imageUrl ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function pickFile(next: File | null) {
    setFile(next);
    if (next) setPreview(URL.createObjectURL(next));
  }

  /** انتخاب محلی ⇒ فقط لغو؛ تصویر ذخیره‌شده ⇒ حذف از سرور */
  function removeImage() {
    if (file) {
      setFile(null);
      setPreview(item?.imageUrl ?? null);
      return;
    }
    if (!item?.imageUrl) return;
    startTransition(async () => {
      const result = await removeMenuItemImageAction(item.id);
      if (!result.ok) return toast.error(result.message);
      setPreview(null);
      router.refresh();
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveMenuItemAction(menuId, item?.id ?? null, {
        name,
        description,
        categoryId,
        price: parseIntegerInput(price) ?? Number.NaN,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      if (file) {
        try {
          await uploadImage(result.id, file);
        } catch (error) {
          // آیتم ذخیره شده؛ فقط تصویر ماند
          toast.error((error as Error).message);
          router.refresh();
          return;
        }
      }
      toast.success(item ? "آیتم ذخیره شد." : "آیتم اضافه شد.");
      router.refresh();
      onClose();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
          {preview ? (
            // پیش‌نمایش محلی (blob) یا تصویر فعلی؛ کوچک و بدون بهینه‌سازی
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-neutral-400">
              بدون تصویر
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="cursor-pointer font-medium text-neutral-900 underline underline-offset-4">
            {preview ? "تغییر تصویر" : "انتخاب تصویر"}
            <input
              type="file"
              accept={IMAGE_MIME_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {preview ? (
            <button
              type="button"
              onClick={removeImage}
              className="text-start text-red-600 hover:underline"
            >
              {file ? "لغو انتخاب" : "حذف تصویر"}
            </button>
          ) : null}
          <span className="text-xs text-neutral-500">
            مربع برش می‌خورد؛ JPG، PNG یا WebP تا ۵ مگابایت.
          </span>
        </div>
      </div>

      <Field label="نام" htmlFor="item-name" error={errors.name} required>
        <Input
          id="item-name"
          value={name}
          invalid={!!errors.name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field
        label="توضیح کوتاه (اختیاری)"
        htmlFor="item-description"
        error={errors.description}
      >
        <Input
          id="item-description"
          value={description}
          invalid={!!errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="قیمت (تومان)"
          htmlFor="item-price"
          error={errors.price}
          required
        >
          <Input
            id="item-price"
            dir="ltr"
            inputMode="numeric"
            value={price}
            invalid={!!errors.price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </Field>
        <Field label="دسته" htmlFor="item-category" error={errors.categoryId}>
          <Select
            id="item-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          انصراف
        </Button>
        <Button type="submit" loading={isPending}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}

export function MenuItemModal({
  menuId,
  editing,
  categories,
  onClose,
}: {
  menuId: string;
  editing: ItemEditing | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing?.item ? "ویرایش آیتم" : "آیتم جدید"}
    >
      {editing ? (
        <ItemForm
          menuId={menuId}
          editing={editing}
          categories={categories}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
