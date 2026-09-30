import type { Metadata } from "next";
import Link from "next/link";

import { panel } from "@/components/shop/styles";
import { formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { cn } from "@/lib/utils";
import { WALLET_REASON_LABELS } from "@/lib/wallet";
import { requireUser } from "@/server/auth/current-user";
import { getMyWallet } from "@/server/services/account.service";

export const metadata: Metadata = { title: "کیف پول" };

export default async function MyWalletPage() {
  const user = await requireUser();
  const wallet = await getMyWallet(user.id);

  return (
    <div className="flex flex-col gap-5">
      <section
        className={cn(
          panel,
          "flex flex-wrap items-center justify-between gap-3 p-5 md:p-6",
        )}
      >
        <h2 className="font-extrabold">موجودی کیف پول</h2>
        <p className="text-action text-3xl font-extrabold">
          {formatToman(wallet.balance)}{" "}
          <span className="text-ink-2 text-sm font-semibold">تومان</span>
        </p>
        <p className="text-muted w-full text-sm leading-7">
          موجودی کیف پول را می‌توانید در صفحه‌ی پرداخت هر سفارش استفاده کنید
          (وقتی برای کل مبلغ سفارش کافی باشد).
        </p>
      </section>

      <section
        className={cn(panel, "flex flex-col gap-3 p-5 md:p-6")}
        aria-labelledby="wallet-history"
      >
        <h2 id="wallet-history" className="font-extrabold">
          تاریخچه‌ی تراکنش‌ها
        </h2>
        {wallet.transactions.length === 0 ? (
          <p className="text-muted text-sm">هنوز تراکنشی ندارید.</p>
        ) : (
          <ul className="divide-y divide-[rgb(201_168_118/0.12)]">
            {wallet.transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="flex flex-col gap-1">
                  <span className="font-bold">
                    {WALLET_REASON_LABELS[tx.reason]}
                    {tx.orderNumber ? (
                      <>
                        {" "}
                        <Link
                          href={`/account/orders/${encodeURIComponent(tx.orderNumber)}`}
                          dir="ltr"
                          className="text-gold font-mono text-xs"
                        >
                          {tx.orderNumber}
                        </Link>
                      </>
                    ) : null}
                  </span>
                  <span className="text-muted text-xs">
                    {formatJalaliDateTime(tx.createdAt)} · موجودی پس از تراکنش{" "}
                    {formatToman(tx.balanceAfter)} تومان
                  </span>
                </span>
                <span
                  dir="ltr"
                  className={cn(
                    "font-extrabold",
                    tx.type === "CREDIT" ? "text-action" : "text-danger",
                  )}
                >
                  {tx.type === "CREDIT" ? "+" : "−"}
                  {formatToman(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
