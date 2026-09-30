"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { saveMenuCategoryAction } from "@/server/actions/menu";

export type CategoryEditing = { id: string; name: string } | "new";

function CategoryForm({
  menuId,
  editing,
  onClose,
}: {
  menuId: string;
  editing: CategoryEditing;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(editing === "new" ? "" : editing.name);
  const [error, setError] = useState<string>();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveMenuCategoryAction(
        menuId,
        editing === "new" ? null : editing.id,
        { name },
      );
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.message);
        return;
      }
      toast.success(
        editing === "new" ? "دسته اضافه شد." : "نام دسته ذخیره شد.",
      );
      router.refresh();
      onClose();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="نام دسته"
        htmlFor="menu-category-name"
        error={error}
        required
      >
        <Input
          id="menu-category-name"
          value={name}
          placeholder="مثلاً دمنوش‌ها"
          invalid={!!error}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-3">
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

export function CategoryNameModal({
  menuId,
  editing,
  onClose,
}: {
  menuId: string;
  editing: CategoryEditing | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing === "new" ? "دسته‌ی جدید" : "تغییر نام دسته"}
    >
      {editing !== null ? (
        <CategoryForm menuId={menuId} editing={editing} onClose={onClose} />
      ) : null}
    </Modal>
  );
}
