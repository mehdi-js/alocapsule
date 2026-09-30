import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

/** عنوان صفحه + breadcrumb + دکمه‌های عملیات */
export function PageHeader({
  title,
  crumbs,
  actions,
}: {
  title: string;
  crumbs: Crumb[];
  actions?: ReactNode;
}) {
  const trail: Crumb[] = [{ label: "مدیریت", href: "/admin" }, ...crumbs];
  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="مسیر صفحه">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          {trail.map((crumb, index) => (
            <li
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-2"
            >
              {index > 0 ? <span aria-hidden>/</span> : null}
              {crumb.href && index < trail.length - 1 ? (
                <Link href={crumb.href} className="hover:text-neutral-900">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={index === trail.length - 1 ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions}
      </div>
    </div>
  );
}
