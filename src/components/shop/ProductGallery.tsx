"use client";

import Image from "next/image";
import { useState } from "react";

import { cn, toPersianDigits } from "@/lib/utils";

import { Placeholder } from "./Placeholder";
import { ShareButton } from "./ShareButton";

export interface GalleryImage {
  url: string;
  thumbUrl: string;
  alt: string | null;
}

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="relative h-[300px] overflow-hidden rounded-[22px] md:h-[440px]">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt ?? productName}
            fill
            // تصویر اصلی محصول: LCP صفحه
            priority={active === 0}
            sizes="(max-width: 767px) 100vw, 640px"
            className="object-cover"
          />
        ) : (
          <Placeholder
            size="1000 × 1000"
            label="تصویر اصلی محصول"
            className="h-full w-full rounded-[22px]"
          />
        )}
        <div className="absolute top-4 end-4">
          <ShareButton title={productName} />
        </div>
      </div>

      {images.length > 1 ? (
        <ul className="grid grid-cols-4 gap-3" aria-label="تصاویر محصول">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`نمایش تصویر ${toPersianDigits(index + 1)}`}
                aria-pressed={index === active}
                className={cn(
                  "relative block h-[72px] w-full overflow-hidden rounded-[14px] border transition md:h-[92px]",
                  index === active
                    ? "border-brand-strong"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={image.thumbUrl}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
