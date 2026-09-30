/**
 * بررسی سلامت مالی (فاز ۱۳): تطابق ledger و موجودی کیف پول، `usedCount`
 * کدهای تخفیف و redemptionها، فرمول مبلغ سفارش‌ها و پرداختِ سفارش‌های
 * پرداخت‌شده. ناهمخوانی ⇒ خروج با کد ۱ (مناسب cron و هشدار).
 *
 * اجرا: npm run check:finance
 */
import { db } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { runFinanceAudit } from "../src/server/services/finance-audit.service";

async function main(): Promise<number> {
  const report = await runFinanceAudit();
  const sections: [string, unknown[]][] = [
    ["کیف پول (ledger ≠ موجودی)", report.ledger],
    ["کد تخفیف (usedCount ≠ redemption)", report.coupons],
    ["مبلغ سفارش (فرمول یا جمع اقلام)", report.orderTotals],
    ["سفارش پرداخت‌شده بدون پرداخت تأییدشده", report.paidWithoutPayment],
  ];
  for (const [title, rows] of sections) {
    console.log(`${rows.length === 0 ? "✔" : "✘"} ${title}: ${rows.length}`);
    for (const row of rows) console.log(`    ${JSON.stringify(row)}`);
  }
  logger.info("finance_audit", {
    ok: report.ok,
    ledger: report.ledger.length,
    coupons: report.coupons.length,
    orderTotals: report.orderTotals.length,
    paidWithoutPayment: report.paidWithoutPayment.length,
  });
  return report.ok ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    logger.error("finance_audit_failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
