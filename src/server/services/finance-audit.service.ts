import {
  type CouponUsageMismatch,
  findCouponUsageMismatches,
  findOrderTotalMismatches,
  findPaidOrdersWithoutPayment,
  type OrderTotalMismatch,
} from "@/server/repositories/finance-audit.repository";
import {
  findLedgerMismatches,
  type LedgerMismatch,
} from "@/server/repositories/wallet.repository";

export interface FinanceAuditReport {
  ok: boolean;
  ledger: LedgerMismatch[];
  coupons: CouponUsageMismatch[];
  orderTotals: OrderTotalMismatch[];
  paidWithoutPayment: { orderNumber: string; grandTotal: number }[];
}

/** بررسی سلامت مالی (فاز ۱۳): ledger، مصرف کوپن، فرمول مبلغ، پرداخت‌ها */
export async function runFinanceAudit(): Promise<FinanceAuditReport> {
  const [ledger, coupons, orderTotals, paidWithoutPayment] = await Promise.all([
    findLedgerMismatches(),
    findCouponUsageMismatches(),
    findOrderTotalMismatches(),
    findPaidOrdersWithoutPayment(),
  ]);
  return {
    ok:
      ledger.length +
        coupons.length +
        orderTotals.length +
        paidWithoutPayment.length ===
      0,
    ledger,
    coupons,
    orderTotals,
    paidWithoutPayment,
  };
}
