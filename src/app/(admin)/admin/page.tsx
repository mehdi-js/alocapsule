import type { Metadata } from "next";
import Link from "next/link";

import {
  CategoryPieChart,
  SalesLineChart,
} from "@/components/admin/dashboard/Charts";
import {
  ordersHint,
  Panel,
  RangeFilter,
  StatCard,
  toman,
} from "@/components/admin/dashboard/DashboardParts";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatToman } from "@/lib/money";
import { resolveRange } from "@/lib/report-range";
import { isIndexingAllowed } from "@/lib/seo/indexing";
import { toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { getDashboard } from "@/server/services/report.service";

export const metadata: Metadata = { title: "داشبورد" };

const KIND_LABELS = { SERVICE: "خدمت", PHYSICAL: "کالای فیزیکی" } as const;

function Empty() {
  return (
    <p className="text-sm text-neutral-500">در این بازه فروشی ثبت نشده است.</p>
  );
}

/**
 * داشبورد گزارش. «فروش» = سفارش پرداخت‌شده و لغونشده به تاریخ ثبت سفارش،
 * با مبلغ نهایی (`grandTotal`)؛ تخفیف جداگانه.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const resolved = resolveRange(params);
  const fallback = resolveRange({ preset: "30d" });
  const range = resolved.ok
    ? resolved.range
    : fallback.ok
      ? fallback.range
      : null;
  if (!range) throw new Error("default report range failed");
  const { cards, range: data } = await getDashboard(range);

  return (
    <>
      <PageHeader title="داشبورد" crumbs={[]} />

      {/* SEO.md §۸.۳: روی سرور اصلی، سایت بسته برای گوگل هشدار قرمز دارد */}
      {process.env.NODE_ENV === "production" && !isIndexingAllowed() ? (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white"
        >
          سایت برای گوگل بسته است (ALLOW_INDEXING=true تنظیم نشده). هنگام انتشار
          آن را در ‎.env.production روی true بگذارید.{" "}
          <Link href="/admin/settings/seo" className="underline">
            جزئیات
          </Link>
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="فروش امروز"
          value={toman(cards.today.sales)}
          hint={ordersHint(cards.today.orders)}
        />
        <StatCard
          label="فروش این هفته (از شنبه)"
          value={toman(cards.week.sales)}
          hint={ordersHint(cards.week.orders)}
        />
        <StatCard
          label="فروش این ماه"
          value={toman(cards.month.sales)}
          hint={ordersHint(cards.month.orders)}
        />
        <StatCard
          label="در انتظار تأیید رسید"
          value={`${toPersianDigits(cards.awaitingReview)} سفارش`}
          hint="بررسی رسیدها ←"
          href="/admin/payments"
        />
      </div>

      <RangeFilter
        preset={resolved.ok ? range.preset : "custom"}
        from={params.from ?? ""}
        to={params.to ?? ""}
        error={
          resolved.ok ? null : `${resolved.message}؛ ۳۰ روز اخیر نمایش داده شد.`
        }
      />

      <h2 className="mt-6 mb-3 text-lg font-bold">
        گزارش {toPersianDigits(range.label)}
      </h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="فروش" value={toman(data.summary.sales)} />
        <StatCard
          label="تعداد سفارش‌های فروش"
          value={toPersianDigits(data.summary.orders)}
        />
        <StatCard label="میانگین سبد" value={toman(data.summary.average)} />
        <StatCard
          label="تخفیف داده‌شده"
          value={toman(data.summary.discount)}
          hint="جدا از فروش؛ فروش مبلغ پس از تخفیف است"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
        {data.kinds.map((row) => (
          <StatCard
            key={row.kind}
            label={`فروش ${KIND_LABELS[row.kind]}`}
            value={toman(row.total)}
            hint={`${toPersianDigits(row.quantity)} عدد در ${toPersianDigits(row.orders)} سفارش · مبلغ اقلام`}
          />
        ))}
        <Panel title="فروش به تفکیک نوع">
          {data.kinds.every((row) => row.total === 0) ? (
            <Empty />
          ) : (
            <CategoryPieChart
              data={data.kinds.map((row) => ({
                name: KIND_LABELS[row.kind],
                total: row.total,
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="فروش روزانه">
          <SalesLineChart data={data.daily} />
        </Panel>
        <Panel title="سهم دسته‌بندی‌ها (مبلغ اقلام)">
          {data.categories.length === 0 ? (
            <Empty />
          ) : (
            <CategoryPieChart data={data.categories} />
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="پرفروش‌ترین محصولات">
          {data.topProducts.length === 0 ? (
            <Empty />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>محصول</TH>
                  <TH>نوع</TH>
                  <TH>تعداد</TH>
                  <TH>مبلغ اقلام</TH>
                </tr>
              </THead>
              <TBody>
                {data.topProducts.map((row, index) => (
                  <TR key={`${row.name}-${index}`}>
                    <TD>{row.name}</TD>
                    <TD>{KIND_LABELS[row.kind]}</TD>
                    <TD>{toPersianDigits(row.quantity)}</TD>
                    <TD className="whitespace-nowrap">{toman(row.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
        <Panel title="پرفروش‌ترین متغیرها">
          {data.topVariants.length === 0 ? (
            <Empty />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>محصول</TH>
                  <TH>متغیر</TH>
                  <TH>تعداد</TH>
                  <TH>مبلغ اقلام</TH>
                </tr>
              </THead>
              <TBody>
                {data.topVariants.map((row, index) => (
                  <TR key={`${row.productName}-${row.variantTitle}-${index}`}>
                    <TD>{row.productName}</TD>
                    <TD>{row.variantTitle}</TD>
                    <TD>{toPersianDigits(row.quantity)}</TD>
                    <TD className="whitespace-nowrap">{toman(row.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>

      <Panel title="گزارش تخفیف به تفکیک کد" className="mt-6">
        {data.discounts.length === 0 ? (
          <p className="text-sm text-neutral-500">
            در این بازه تخفیفی داده نشده است.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>کد</TH>
                <TH>تعداد سفارش</TH>
                <TH>جمع تخفیف</TH>
                <TH>فروش این سفارش‌ها</TH>
              </tr>
            </THead>
            <TBody>
              {data.discounts.map((row) => (
                <TR key={row.code}>
                  <TD dir="ltr" className="text-start font-mono">
                    {row.code}
                  </TD>
                  <TD>{toPersianDigits(row.orders)}</TD>
                  <TD className="whitespace-nowrap">
                    {formatToman(row.discount)} تومان
                  </TD>
                  <TD className="whitespace-nowrap">{toman(row.sales)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
