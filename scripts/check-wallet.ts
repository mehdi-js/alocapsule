/**
 * بررسی دفتر کل کیف پول (بند ۷.۴، معیار فاز ۹): برای هر کاربر
 * جمع CREDIT − DEBIT و `balanceAfter` آخرین تراکنش باید دقیقاً برابر
 * `User.walletBalance` باشد. ناهمخوانی ⇒ خروج با کد ۱ (مناسب cron/CI).
 *
 * اجرا: npm run check:wallet
 */
import { db } from "../src/lib/db";
import { findLedgerMismatches } from "../src/server/repositories/wallet.repository";

async function main(): Promise<number> {
  const [mismatches, users] = await Promise.all([
    findLedgerMismatches(),
    db.user.count(),
  ]);

  if (mismatches.length === 0) {
    console.log(`✔ دفتر کل کیف پول سالم است (${users} کاربر بررسی شد).`);
    return 0;
  }

  console.error(`✘ ${mismatches.length} کاربر ناهمخوانی دارد:`);
  for (const m of mismatches) {
    console.error(
      `  ${m.phone}: walletBalance=${m.walletBalance} ledger=${m.ledgerBalance} lastBalanceAfter=${m.lastBalanceAfter ?? "-"}`,
    );
  }
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
