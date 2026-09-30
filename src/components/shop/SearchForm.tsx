import { cn } from "@/lib/utils";

import { SearchIcon } from "./icons";

/** جستجوی محصول با فرم GET (بدون جاوااسکریپت هم کار می‌کند). */
export function SearchForm({
  defaultValue = "",
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form
      action="/products"
      method="get"
      role="search"
      className={cn(
        "bg-card flex items-center gap-2.5 rounded-full border border-control px-4.5 py-1 focus-within:border-strong",
        className,
      )}
    >
      <SearchIcon size={17} className="text-muted shrink-0" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="جستجوی محصول…"
        aria-label="جستجوی محصول"
        maxLength={100}
        className="placeholder:text-muted text-ink min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
      />
    </form>
  );
}
