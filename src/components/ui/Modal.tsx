"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * پنجره‌ی مودال روی عنصر native `<dialog>`: مدیریت فوکوس، Esc و backdrop
 * را خود مرورگر انجام می‌دهد.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal فوکوس را به اولین کنترل (دکمه‌ی بستن) می‌دهد؛ اولین فیلد فرم مطلوب‌تر است.
      dialog
        .querySelector<HTMLElement>(
          "input:not([type=hidden]), textarea, select",
        )
        ?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // کلیک روی backdrop (خود dialog) مودال را می‌بندد.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-black/40",
        className,
      )}
    >
      {open ? (
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="rounded-lg px-2 py-1 text-xl leading-none text-neutral-500 hover:bg-neutral-100"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
