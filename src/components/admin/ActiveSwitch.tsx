"use client";

import { useState, useTransition } from "react";

import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/server/actions/types";

/**
 * کلید فعال/غیرفعال با اعمال فوری: بلافاصله (خوش‌بینانه) عوض می‌شود و اگر
 * سرور خطا داد به حالت قبل برمی‌گردد و پیام خطا نشان داده می‌شود.
 */
export function ActiveSwitch({
  initialChecked,
  label,
  onToggle,
  size,
  activeMessage,
  inactiveMessage,
}: {
  initialChecked: boolean;
  label: string;
  onToggle: (next: boolean) => Promise<ActionResult>;
  size?: "md" | "lg";
  activeMessage: string;
  inactiveMessage: string;
}) {
  const toast = useToast();
  const [checked, setChecked] = useState(initialChecked);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    const previous = checked;
    setChecked(next);
    startTransition(async () => {
      const result = await onToggle(next);
      if (!result.ok) {
        setChecked(previous);
        toast.error(result.message);
        return;
      }
      toast.success(next ? activeMessage : inactiveMessage);
    });
  }

  return (
    <Switch
      checked={checked}
      onChange={handleChange}
      label={label}
      disabled={isPending}
      size={size}
    />
  );
}
