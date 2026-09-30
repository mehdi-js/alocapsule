"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import type { AdminUserFormInput } from "@/lib/validation/user";
import { updateUserAction } from "@/server/actions/user-admin";

/**
 * ویرایش کاربر. تغییر نقش یا غیرفعال‌سازی ⇒ همه‌ی نشست‌های کاربر باطل
 * می‌شود. ادمین نقش/وضعیت حساب خودش را تغییر نمی‌دهد.
 */
export function UserEditForm({
  userId,
  initial,
  isSelf,
}: {
  userId: string;
  initial: AdminUserFormInput;
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateUserAction(userId, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      toast.success("اطلاعات کاربر ذخیره شد.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="نام" htmlFor="user-fullName" error={errors.fullName}>
        <Input
          id="user-fullName"
          value={values.fullName}
          onChange={(e) =>
            setValues((v) => ({ ...v, fullName: e.target.value }))
          }
          invalid={Boolean(errors.fullName)}
        />
      </Field>
      <Field label="ایمیل" htmlFor="user-email" error={errors.email}>
        <Input
          id="user-email"
          type="email"
          dir="ltr"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          invalid={Boolean(errors.email)}
        />
      </Field>
      <Field
        label="نقش"
        htmlFor="user-role"
        hint={
          isSelf
            ? "نقش حساب خودتان قابل تغییر نیست."
            : "تغییر نقش، کاربر را از همه‌ی دستگاه‌ها خارج می‌کند."
        }
      >
        <Select
          id="user-role"
          value={values.role}
          disabled={isSelf}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              role: e.target.value as AdminUserFormInput["role"],
            }))
          }
        >
          <option value="CUSTOMER">مشتری</option>
          <option value="ADMIN">ادمین</option>
        </Select>
      </Field>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-3">
        <div>
          <p className="text-sm font-medium">حساب فعال</p>
          <p className="text-xs text-neutral-500">
            غیرفعال‌سازی، کاربر را فوراً از حساب خارج می‌کند و ورود را مسدود
            می‌کند.
          </p>
        </div>
        <Switch
          checked={values.isActive}
          disabled={isSelf}
          onChange={(checked) =>
            setValues((v) => ({ ...v, isActive: checked }))
          }
          label="حساب فعال"
        />
      </div>
      <Button type="submit" loading={pending}>
        ذخیره
      </Button>
    </form>
  );
}
