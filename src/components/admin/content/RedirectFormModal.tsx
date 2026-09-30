"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { saveRedirectAction } from "@/server/actions/content";
import type { RedirectListItem } from "@/server/services/redirect-query.service";

export type EditingRedirect =
  { mode: "new"; fromPath: string } | { mode: "edit"; item: RedirectListItem };

interface State {
  fromPath: string;
  toPath: string;
  statusCode: 301 | 410;
  note: string;
  isActive: boolean;
}

function initialState(editing: EditingRedirect): State {
  if (editing.mode === "new") {
    return {
      fromPath: editing.fromPath,
      toPath: "",
      statusCode: 301,
      note: "",
      isActive: true,
    };
  }
  return {
    fromPath: editing.item.fromPath,
    toPath: editing.item.toPath,
    statusCode: editing.item.statusCode === 410 ? 410 : 301,
    note: editing.item.note ?? "",
    isActive: editing.item.isActive,
  };
}

function RedirectForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: EditingRedirect;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(() => initialState(editing));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function patch(update: Partial<State>) {
    setState((current) => ({ ...current, ...update }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveRedirectAction(
        editing.mode === "edit" ? editing.item.id : null,
        state,
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("ریدایرکت ذخیره شد (حداکثر تا یک دقیقه اعمال می‌شود).");
      if (result.finalTarget) {
        toast.error(
          `مقصد خودش ریدایرکت دارد؛ بازدیدکننده مستقیم به ${result.finalTarget} می‌رود. بهتر است همین را مقصد بگذارید.`,
        );
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field
        label="آدرس قدیمی (مبدأ)"
        htmlFor="redirect-from"
        error={errors.fromPath}
        hint="مسیر یا آدرس کامل سایت قبلی؛ آدرس‌های فارسی درصد-کدشده هم پذیرفته می‌شوند."
        required
      >
        <Input
          id="redirect-from"
          dir="ltr"
          value={state.fromPath}
          invalid={!!errors.fromPath}
          placeholder="/product/باقلوا-گردویی"
          onChange={(event) => patch({ fromPath: event.target.value })}
        />
      </Field>
      <Field label="نوع" htmlFor="redirect-status">
        <Select
          id="redirect-status"
          value={state.statusCode}
          onChange={(event) =>
            patch({ statusCode: Number(event.target.value) as 301 | 410 })
          }
        >
          <option value={301}>301 — انتقال دائمی به آدرس جدید</option>
          <option value={410}>410 — این صفحه برای همیشه حذف شده</option>
        </Select>
      </Field>
      {state.statusCode === 301 ? (
        <Field
          label="آدرس جدید (مقصد)"
          htmlFor="redirect-to"
          error={errors.toPath}
          hint="مسیر داخلی مثل /products/baklava-gerdouyi"
          required
        >
          <Input
            id="redirect-to"
            dir="ltr"
            value={state.toPath}
            invalid={!!errors.toPath}
            onChange={(event) => patch({ toPath: event.target.value })}
          />
        </Field>
      ) : null}
      <Field label="یادداشت" htmlFor="redirect-note" error={errors.note}>
        <Input
          id="redirect-note"
          value={state.note}
          onChange={(event) => patch({ note: event.target.value })}
        />
      </Field>
      <label className="flex items-center gap-3 text-sm font-medium">
        فعال
        <Switch
          checked={state.isActive}
          label="فعال بودن ریدایرکت"
          onChange={(isActive) => patch({ isActive })}
        />
      </label>
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

export function RedirectFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: EditingRedirect | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing?.mode === "edit" ? "ویرایش ریدایرکت" : "ریدایرکت جدید"}
    >
      {editing ? (
        <RedirectForm editing={editing} onClose={onClose} onSaved={onSaved} />
      ) : null}
    </Modal>
  );
}
