import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";
import { ORDER_STATUS_LABELS, PAYABLE_STATUSES } from "@/lib/order-status";
import { cardDigits, formatCardNumber } from "@/lib/payment";
import { getPrivateStorage } from "@/lib/storage/private";
import { listActiveBankCards } from "@/server/repositories/bank-card.repository";
import {
  findCustomerOrder,
  findReceiptAccess,
} from "@/server/repositories/payment.repository";
import { findWalletBalance } from "@/server/repositories/wallet.repository";

/** داده‌ی صفحه‌ی پرداخت مشتری و سرو امن تصویر رسید */

export interface BankCardDto {
  id: string;
  bankName: string;
  cardNumber: string;
  /** فقط ارقام، برای دکمه‌ی کپی */
  cardDigits: string;
  shebaNumber: string | null;
  accountHolderName: string;
}

export interface CustomerPaymentDto {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  referenceNumber: string | null;
  payerCardLast4: string | null;
  paidAtClaimed: Date | null;
  rejectReason: string | null;
  hasReceipt: boolean;
  createdAt: Date;
}

export interface PaymentPageDto {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  grandTotal: number;
  placedAt: Date;
  /** مشتری می‌تواند رسید بفرستد یا از کیف پول بپردازد */
  canPay: boolean;
  bankCards: BankCardDto[];
  /** آخرین پرداخت (برای نمایش رسید در حال بررسی یا دلیل رد) */
  lastPayment: CustomerPaymentDto | null;
  walletBalance: number;
}

export async function getPaymentPage(
  orderNumber: string,
  userId: string,
): Promise<PaymentPageDto | null> {
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) return null;
  const order = await findCustomerOrder(orderNumber, userId);
  if (!order) return null;

  const [cards, wallet] = await Promise.all([
    listActiveBankCards(),
    findWalletBalance(userId),
  ]);
  const last = order.payments[0];
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    grandTotal: order.grandTotal,
    placedAt: order.placedAt,
    canPay: PAYABLE_STATUSES.includes(order.status) && !order.paidAt,
    bankCards: cards.map((card) => ({
      id: card.id,
      bankName: card.bankName,
      cardNumber: formatCardNumber(card.cardNumber),
      cardDigits: cardDigits(card.cardNumber),
      shebaNumber: card.shebaNumber,
      accountHolderName: card.accountHolderName,
    })),
    lastPayment: last
      ? {
          id: last.id,
          method: last.method,
          status: last.status,
          amount: last.amount,
          referenceNumber: last.referenceNumber,
          payerCardLast4: last.payerCardLast4,
          paidAtClaimed: last.paidAtClaimed,
          rejectReason: last.rejectReason,
          hasReceipt: last.receiptImageUrl !== null,
          createdAt: last.createdAt,
        }
      : null,
    walletBalance: wallet?.walletBalance ?? 0,
  };
}

/**
 * تصویر رسید فقط برای صاحب سفارش یا ادمین. دسترسی نداشتن یا نبودن فایل هر
 * دو `null` است (پاسخ ۴۰۴ یکسان، تا وجود رسید دیگران لو نرود).
 */
export async function getReceiptImage(
  paymentId: string,
  viewer: { id: string; role: "CUSTOMER" | "ADMIN" },
): Promise<Buffer | null> {
  const access = await findReceiptAccess(paymentId);
  if (!access?.receiptImageUrl) return null;
  if (viewer.role !== "ADMIN" && access.order.userId !== viewer.id) {
    return null;
  }
  return getPrivateStorage().read(access.receiptImageUrl);
}
