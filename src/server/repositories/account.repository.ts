import { db } from "@/lib/db";

/** داده‌ی پنل کاربر؛ همه‌ی کوئری‌ها به `userId` محدودند. */

export function listUserOrders(userId: string, take = 100) {
  return db.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotal: true,
      placedAt: true,
      items: {
        orderBy: { id: "asc" },
        select: { productName: true, variantTitle: true, quantity: true },
      },
    },
  });
}

export function findUserOrderDetail(orderNumber: string, userId: string) {
  return db.order.findFirst({
    where: { orderNumber, userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      shippingTotal: true,
      discountTotal: true,
      grandTotal: true,
      couponCode: true,
      shippingMethodName: true,
      shippingPayOnDelivery: true,
      shippingAddressSnapshot: true,
      customerNote: true,
      trackingCode: true,
      placedAt: true,
      paidAt: true,
      shippedAt: true,
      canceledAt: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productName: true,
          variantTitle: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: { id: true, toStatus: true, createdAt: true },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { method: true, status: true, rejectReason: true },
      },
    },
  });
}

export function listUserWalletTransactions(userId: string, take = 200) {
  return db.walletTransaction.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceAfter: true,
      reason: true,
      note: true,
      createdAt: true,
      order: { select: { orderNumber: true } },
    },
  });
}

export function findProfile(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { phone: true, fullName: true, email: true, walletBalance: true },
  });
}

export function updateProfileRecord(
  userId: string,
  data: { fullName: string | null; email: string | null },
) {
  return db.user.update({ where: { id: userId }, data });
}
