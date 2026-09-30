"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * فهرست قابل چینش با drag & drop (@dnd-kit): موس، لمس (با کمی مکث تا
 * اسکرول صفحه مختل نشود) و کیبورد (Space برای برداشتن، جهت‌ها، Space).
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[];
  /** ترتیب جدید شناسه‌ها */
  onReorder: (ordered: T[]) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "برای جابه‌جایی Space را بزنید، با کلیدهای جهت حرکت دهید و با Space رها کنید. Esc لغو می‌کند.",
        },
      }}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** ردیف قابل جابه‌جایی؛ فقط دستگیره drag را شروع می‌کند */
export function SortableRow({
  id,
  label,
  className,
  children,
}: {
  id: string;
  /** برای aria-label دستگیره */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2",
        isDragging && "relative z-10 opacity-80 shadow-lg",
        className,
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`جابه‌جایی ${label}`}
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden
        >
          {[3, 8, 13].flatMap((y) =>
            [5.5, 10.5].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />
            )),
          )}
        </svg>
      </button>
      {children}
    </div>
  );
}
