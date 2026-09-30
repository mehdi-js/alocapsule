"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  buildCatalogHref,
  type CatalogSortKey,
  type CatalogUrlState,
} from "@/lib/catalog-url";

import { ChevronDownIcon } from "./icons";

export function SortSelect({
  state,
  labels,
  basePath,
}: {
  state: CatalogUrlState;
  labels: Record<CatalogSortKey, string>;
  basePath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="text-muted flex items-center gap-3 text-sm">
      مرتب‌سازی:
      <span className="relative">
        <select
          value={state.sort}
          disabled={isPending}
          onChange={(event) => {
            const sort = event.target.value as CatalogSortKey;
            startTransition(() =>
              router.push(
                buildCatalogHref({ ...state, sort, page: 1 }, basePath),
                {
                  scroll: false,
                },
              ),
            );
          }}
          className="bg-card text-ink appearance-none rounded-full border border-control py-2.5 ps-5 pe-10 text-[15px] font-bold outline-none focus:border-strong"
        >
          {(Object.keys(labels) as CatalogSortKey[]).map((key) => (
            <option key={key} value={key}>
              {labels[key]}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          size={14}
          className="text-accent pointer-events-none absolute end-4 top-1/2 -translate-y-1/2"
        />
      </span>
    </label>
  );
}
