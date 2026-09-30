"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * متن جایگزین (alt) هر تصویر؛ الزامی. با خروج از فیلد ذخیره می‌شود؛ خالی ⇒
 * خطا و ذخیره نمی‌شود.
 */
export function ImageAltInput({
  id,
  value,
  disabled,
  onSave,
}: {
  id: string;
  value: string;
  disabled: boolean;
  onSave: (alt: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  function commit() {
    const alt = draft.replace(/\s+/g, " ").trim();
    if (alt.length < 2) {
      setError("متن جایگزین الزامی است.");
      return;
    }
    setError(null);
    if (alt !== value) onSave(alt);
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium">
        متن جایگزین (alt) <span className="text-red-600">*</span>
      </label>
      <input
        id={id}
        value={draft}
        disabled={disabled}
        maxLength={150}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        className={cn(
          "w-full rounded-md border px-2 py-1.5 text-xs",
          error ? "border-red-500" : "border-neutral-300",
        )}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
