import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
      <p className="text-lg font-bold">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-neutral-600">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
