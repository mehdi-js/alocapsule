"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { createMenuAction, updateMenuAction } from "@/server/actions/menu";

export interface EditableMenu {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

function MenuForm({
  editing,
  copySources,
  onClose,
}: {
  editing: EditableMenu | "new";
  copySources: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const initial = editing === "new" ? null : editing;
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [copyFrom, setCopyFrom] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const input = { name, slug, description, isActive };
      const result =
        editing === "new"
          ? await createMenuAction(input, copyFrom || null)
          : await updateMenuAction(editing.id, input);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(editing === "new" ? "منو ساخته شد." : "منو ذخیره شد.");
      if (editing === "new" && "id" in result) {
        router.push(`/admin/menus/${result.id}`);
      } else {
        router.refresh();
      }
      onClose();
    });
  }

  const slugChanged = initial !== null && slug.trim() !== initial.slug;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="نام منو" htmlFor="menu-name" error={errors.name} required>
        <Input
          id="menu-name"
          value={name}
          placeholder="مثلاً شعبه ولیعصر"
          invalid={!!errors.name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field
        label="نشانی صفحه"
        htmlFor="menu-slug"
        error={errors.slug}
        hint={
          slugChanged
            ? "⚠️ با تغییر نشانی، QR codeهای چاپ‌شده‌ی قبلی دیگر کار نمی‌کنند."
            : "حروف کوچک انگلیسی، عدد و خط تیره؛ آدرس: /menu/نشانی"
        }
        required
      >
        <Input
          id="menu-slug"
          dir="ltr"
          value={slug}
          placeholder="valiasr"
          invalid={!!errors.slug}
          onChange={(event) => setSlug(event.target.value)}
        />
      </Field>
      <Field
        label="توضیح کوتاه (اختیاری)"
        htmlFor="menu-description"
        error={errors.description}
        hint="زیر عنوان منو؛ مثلاً نشانی یا ساعت کاری."
      >
        <Input
          id="menu-description"
          value={description}
          invalid={!!errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      {editing === "new" && copySources.length > 0 ? (
        <Field label="شروع از" htmlFor="menu-copy">
          <Select
            id="menu-copy"
            value={copyFrom}
            onChange={(event) => setCopyFrom(event.target.value)}
          >
            <option value="">منوی خالی</option>
            {copySources.map((menu) => (
              <option key={menu.id} value={menu.id}>
                کپی از «{menu.name}»
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <label className="flex items-center gap-3 text-sm font-medium">
        <Switch
          checked={isActive}
          label="فعال بودن منو"
          onChange={setIsActive}
        />
        فعال (غیرفعال ⇒ صفحه‌ی منو در دسترس نیست)
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          انصراف
        </Button>
        <Button type="submit" loading={isPending}>
          {editing === "new" ? "ساخت منو" : "ذخیره"}
        </Button>
      </div>
    </form>
  );
}

export function MenuFormModal({
  editing,
  copySources = [],
  onClose,
}: {
  editing: EditableMenu | "new" | null;
  copySources?: { id: string; name: string }[];
  onClose: () => void;
}) {
  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing === "new" ? "منوی جدید" : "تنظیمات منو"}
    >
      {editing !== null ? (
        <MenuForm
          editing={editing}
          copySources={copySources}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
