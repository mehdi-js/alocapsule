"use client";

import { useEffect, useRef } from "react";

import { CloseIcon } from "@/components/shop/icons";
import type { MenuItemDto } from "@/server/services/menu-query.service";

import { MenuPrice, MenuThumb } from "./MenuItemRow";

/**
 * نمای بزرگ آیتم (bottom sheet روی موبایل، پنجره‌ی وسط روی دسکتاپ) روی
 * `<dialog>` بومی: Esc، فوکوس و بستن با لمس بیرون.
 */
export function MenuItemSheet({
  item,
  onClose,
}: {
  item: MenuItemDto | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label={item?.name}
      className="bg-panel text-ink m-0 mt-auto w-full max-w-none rounded-t-[28px] border border-[rgb(201_168_118/0.18)] p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-[28px]"
    >
      {item ? (
        <div className="flex flex-col items-center gap-4 px-6 pt-3 pb-8 text-center">
          <span
            aria-hidden
            className="h-1 w-10 rounded-full bg-[rgb(201_168_118/0.3)] sm:hidden"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="text-muted hover:text-ink absolute top-4 left-4 flex size-9 items-center justify-center rounded-full transition"
          >
            <CloseIcon size={18} />
          </button>
          <MenuThumb
            item={item}
            size={240}
            className="mt-3 max-w-full rounded-[24px]"
          />
          <h3 className="text-xl font-extrabold">{item.name}</h3>
          {item.description ? (
            <p className="text-ink-2 text-sm leading-7">{item.description}</p>
          ) : null}
          <MenuPrice price={item.price} className="text-gold text-lg" />
        </div>
      ) : null}
    </dialog>
  );
}
