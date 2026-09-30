"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteMenuAction } from "@/server/actions/menu";

import { type EditableMenu, MenuFormModal } from "./MenuFormModal";

/** دکمه‌های تنظیمات و حذف منو (سربرگ صفحه‌ی ویرایش) */
export function MenuSettingsActions({ menu }: { menu: EditableMenu }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteMenuAction(menu.id);
      if (!result.ok) return toast.error(result.message);
      toast.success("منو حذف شد.");
      router.push("/admin/menus");
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setEditing(true)}>
        تنظیمات منو
      </Button>
      <Button
        variant="ghost"
        className="text-red-600"
        onClick={() => setDeleting(true)}
      >
        حذف منو
      </Button>
      <MenuFormModal
        editing={editing ? menu : null}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={deleting}
        title="حذف منو"
        description={`منوی «${menu.name}» با همه‌ی دسته‌ها و آیتم‌هایش حذف شود؟ QR code چاپ‌شده‌ی آن دیگر کار نمی‌کند.`}
        confirmLabel="حذف منو"
        destructive
        loading={isPending}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
