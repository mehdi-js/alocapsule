"use client";

import { type ReactNode, useId, useState } from "react";

import { cn } from "@/lib/utils";

import { ChevronDownIcon } from "./icons";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

/** آکاردئون تک‌باز؛ اولین مورد پیش‌فرض باز است. */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const baseId = useId();

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const open = item.id === openId;
        const panelId = `${baseId}-${item.id}`;
        return (
          <div
            key={item.id}
            className="bg-panel rounded-[18px] border border-[rgb(201_168_118/0.14)]"
          >
            <h2>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 px-5.5 py-4.5 text-start text-base font-bold"
              >
                {item.title}
                <ChevronDownIcon
                  size={16}
                  className={cn(
                    "text-gold shrink-0 transition duration-200",
                    open && "rotate-180",
                  )}
                />
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              hidden={!open}
              className="text-ink-2 px-5.5 pb-5 text-sm leading-[2.1]"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
