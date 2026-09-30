"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_MAINTENANCE_MESSAGE } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import { saveMaintenanceAction } from "@/server/actions/settings";

/**
 * حالت بروزرسانی: همه به‌جز ادمینِ واردشده صفحه‌ی «در حال بروزرسانی» را
 * می‌بینند؛ منوی شعبه‌ها و صفحه‌ی ورود باز می‌مانند.
 */
export function MaintenanceCard({
  enabled,
  message,
}: {
  enabled: boolean;
  message: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(enabled);
  const [text, setText] = useState(
    message === DEFAULT_MAINTENANCE_MESSAGE ? "" : message,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function save(nextOn: boolean) {
    startTransition(async () => {
      const result = await saveMaintenanceAction({
        enabled: nextOn,
        message: text,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        setOn(enabled);
        return;
      }
      setErrors({});
      setOn(nextOn);
      toast.success(
        nextOn
          ? "حالت بروزرسانی فعال شد. بازدیدکنندگان صفحه‌ی بروزرسانی را می‌بینند."
          : "حالت بروزرسانی خاموش شد و سایت برای همه باز است.",
      );
      router.refresh();
    });
  }

  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border p-5",
        on ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">حالت بروزرسانی سایت</h2>
          <p className="text-sm leading-7 text-neutral-600">
            وقتی فعال است، همه به‌جز شما (ادمینِ واردشده) صفحه‌ی «در حال
            بروزرسانی» را می‌بینند. منوی شعبه‌ها (QR) و صفحه‌ی ورود باز
            می‌مانند. تغییر ظرف چند ثانیه اعمال می‌شود.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm font-bold">
          {on ? "فعال" : "خاموش"}
          <Switch
            checked={on}
            size="lg"
            disabled={pending}
            label="حالت بروزرسانی"
            onChange={(next) => save(next)}
          />
        </label>
      </div>
      <Field
        label="پیام صفحه‌ی بروزرسانی (اختیاری)"
        htmlFor="maintenance-message"
        error={errors.message}
        hint={`خالی = «${DEFAULT_MAINTENANCE_MESSAGE}»`}
      >
        <Textarea
          id="maintenance-message"
          rows={2}
          maxLength={300}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() => save(on)}
      >
        ذخیره‌ی پیام
      </Button>
    </section>
  );
}
