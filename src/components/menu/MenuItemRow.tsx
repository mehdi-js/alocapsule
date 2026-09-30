import Image from "next/image";

import { LogoMark } from "@/components/shop/Logo";
import { formatToman } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MenuItemDto } from "@/server/services/menu-query.service";

/** تصویر بندانگشتی مربع؛ بدون تصویر ⇒ نشان برند روی زمینه‌ی ملایم */
export function MenuThumb({
  item,
  size,
  className,
}: {
  item: MenuItemDto;
  size: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-card relative block shrink-0 overflow-hidden border border-hair",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={size}
          height={size}
          unoptimized
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-brand)_18%,transparent),transparent_65%)] opacity-70">
          <LogoMark size={Math.round(size * 0.42)} />
        </span>
      )}
    </span>
  );
}

export function MenuPrice({
  price,
  className,
}: {
  price: number;
  className?: string;
}) {
  return (
    <span
      className={cn("flex items-baseline gap-1 whitespace-nowrap", className)}
    >
      <span className="text-ink font-extrabold tabular-nums">
        {formatToman(price)}
      </span>
      <span className="text-muted text-[11px]">تومان</span>
    </span>
  );
}

/** ردیف آیتم: تصویر، نام، توضیح کوتاه و قیمت؛ لمس ⇒ نمای بزرگ‌تر */
export function MenuItemRow({
  item,
  onOpen,
}: {
  item: MenuItemDto;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-panel flex w-full items-center gap-3.5 rounded-[20px] border border-hair p-2.5 text-start transition hover:border-outline active:scale-[0.99]"
    >
      <MenuThumb item={item} size={76} className="rounded-2xl" />
      <span className="flex min-w-0 flex-1 flex-col gap-1 py-1">
        <span className="text-[15px] leading-6 font-bold">{item.name}</span>
        {item.description ? (
          <span className="text-muted line-clamp-2 text-[13px] leading-6">
            {item.description}
          </span>
        ) : null}
        <MenuPrice price={item.price} className="mt-0.5 text-[15px]" />
      </span>
    </button>
  );
}
