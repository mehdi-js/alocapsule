import type { Metadata } from "next";
import Link from "next/link";

import { OrderStatusPill } from "@/components/shop/account/OrderStatusPill";
import { btnPrimary, panel } from "@/components/shop/styles";
import { formatJalali } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { cn, toPersianDigits } from "@/lib/utils";
import { requireUser } from "@/server/auth/current-user";
import { listMyOrders } from "@/server/services/account.service";

export const metadata: Metadata = { title: "سفارش‌ها" };

export default async function MyOrdersPage() {
  const user = await requireUser();
  const orders = await listMyOrders(user.id);

  if (orders.length === 0) {
    return (
      <div
        className={cn(
          panel,
          "flex flex-col items-center gap-4 p-10 text-center",
        )}
      >
        <p className="text-lg font-extrabold">هنوز سفارشی ثبت نکرده‌اید</p>
        <Link href="/products" className={btnPrimary}>
          مشاهده محصولات
        </Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="orders-heading" className="flex flex-col gap-3">
      <h2 id="orders-heading" className="sr-only">
        سفارش‌های من
      </h2>
      <ul className="flex flex-col gap-3">
        {orders.map((order) => (
          <li key={order.orderNumber}>
            <Link
              href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
              className={cn(
                panel,
                "flex flex-col gap-3 p-4 transition hover:border-outline md:p-5",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span dir="ltr" className="text-accent font-mono font-bold">
                  {order.orderNumber}
                </span>
                <OrderStatusPill
                  status={order.status}
                  label={order.statusLabel}
                />
              </div>
              <p className="text-ink-soft line-clamp-1 text-sm">
                {order.itemsSummary}
              </p>
              <div className="text-muted flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {formatJalali(order.placedAt)} ·{" "}
                  {toPersianDigits(order.itemCount)} عدد
                </span>
                <span className="text-ink font-bold">
                  {formatToman(order.grandTotal)} تومان
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
