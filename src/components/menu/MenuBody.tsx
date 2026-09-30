"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type {
  MenuCategoryDto,
  MenuItemDto,
} from "@/server/services/menu-query.service";

import { MenuItemRow } from "./MenuItemRow";
import { MenuItemSheet } from "./MenuItemSheet";

const sectionId = (id: string) => `menu-cat-${id}`;

/**
 * نوار دسته‌های چسبان (دسته‌ی در حال دیدن پررنگ می‌شود) + فهرست آیتم‌ها.
 * بدون JavaScript هم لینک‌های دسته و متن منو کار می‌کنند.
 */
export function MenuBody({ categories }: { categories: MenuCategoryDto[] }) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const [selected, setSelected] = useState<MenuItemDto | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // دسته‌ای که بالای صفحه (زیر نوار) است فعال می‌شود
  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(sectionId(c.id)))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActiveId(first.target.id.replace("menu-cat-", ""));
      },
      { rootMargin: "-72px 0px -65% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  // تراشه‌ی فعال داخل نوار افقی دیده شود (بدون جابه‌جایی صفحه)
  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-cat="${activeId}"]`);
    if (!bar || !chip) return;
    const target = chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2;
    bar.scrollTo({ left: target, behavior: "smooth" });
  }, [activeId]);

  return (
    <>
      <nav
        aria-label="دسته‌های منو"
        className="bg-surface-alt/85 sticky top-0 z-20 border-b border-hair backdrop-blur-md"
      >
        <div
          ref={barRef}
          className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((category) => {
            const active = category.id === activeId;
            return (
              <a
                key={category.id}
                href={`#${sectionId(category.id)}`}
                data-cat={category.id}
                aria-current={active ? "true" : undefined}
                onClick={() => setActiveId(category.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition",
                  active
                    ? "border-accent bg-accent text-on-accent"
                    : "text-ink-soft border-control hover:border-strong",
                )}
              >
                {category.name}
              </a>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-col gap-9 px-4 pt-6 pb-4">
        {categories.map((category) => (
          <section
            key={category.id}
            id={sectionId(category.id)}
            aria-labelledby={`${sectionId(category.id)}-title`}
            className="scroll-mt-20"
          >
            <div className="mb-4 flex items-center gap-3">
              <h2
                id={`${sectionId(category.id)}-title`}
                className="text-accent text-xl font-extrabold"
              >
                {category.name}
              </h2>
              <span
                aria-hidden
                className="h-px flex-1 bg-gradient-to-l from-accent/45 to-transparent"
              />
            </div>
            <ul className="flex flex-col gap-3">
              {category.items.map((item) => (
                <li key={item.id}>
                  <MenuItemRow item={item} onOpen={() => setSelected(item)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <MenuItemSheet item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
