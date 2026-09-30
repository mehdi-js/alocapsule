"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { cn, toPersianDigits } from "@/lib/utils";
import { updateProfileAction } from "@/server/actions/account";
import type { ProfileDto } from "@/server/services/account.service";

import { ShopField } from "../ShopField";
import { btnPrimary, panel, shopInput } from "../styles";

export function ProfileForm({ profile }: { profile: ProfileDto }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.message);
        return;
      }
      setErrors({});
      toast.success("پروفایل ذخیره شد.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(panel, "flex max-w-xl flex-col gap-4 p-5 md:p-6")}
    >
      <h2 className="font-extrabold">پروفایل</h2>
      <ShopField
        id="profile-phone"
        label="شماره‌ی موبایل"
        hint="شماره‌ی موبایل شناسه‌ی ورود شماست و قابل تغییر نیست."
      >
        <input
          id="profile-phone"
          value={toPersianDigits(profile.phone)}
          readOnly
          dir="ltr"
          className={cn(shopInput, "text-muted text-start")}
        />
      </ShopField>
      <ShopField
        id="profile-fullName"
        label="نام و نام خانوادگی"
        error={errors.fullName}
      >
        <input
          id="profile-fullName"
          value={values.fullName}
          onChange={(event) =>
            setValues((v) => ({ ...v, fullName: event.target.value }))
          }
          autoComplete="name"
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={
            errors.fullName ? "profile-fullName-error" : undefined
          }
          className={shopInput}
        />
      </ShopField>
      <ShopField
        id="profile-email"
        label="ایمیل (اختیاری)"
        error={errors.email}
      >
        <input
          id="profile-email"
          type="email"
          value={values.email}
          onChange={(event) =>
            setValues((v) => ({ ...v, email: event.target.value }))
          }
          autoComplete="email"
          dir="ltr"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "profile-email-error" : undefined}
          className={cn(shopInput, "text-start")}
        />
      </ShopField>
      <button
        type="submit"
        disabled={pending}
        className={cn(btnPrimary, "sm:w-fit")}
      >
        {pending ? "در حال ذخیره…" : "ذخیره"}
      </button>
    </form>
  );
}
