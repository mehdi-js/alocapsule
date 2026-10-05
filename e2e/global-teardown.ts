import { existsSync, readFileSync, rmSync } from "node:fs";

import type { Prisma } from "@prisma/client";

import {
  ADMIN_BACKUP,
  E2E_TMP,
  SHIPPING_BACKUP,
  SMS_CONNECTION_BACKUP,
} from "../playwright.config";

/** پاک‌سازی مشتری، سفارش‌ها و کد تخفیف تست + برگرداندن رمز ادمین */
export default async function globalTeardown() {
  const {
    db,
    ADMIN_PHONE,
    CUSTOMER_PHONE,
    COUPON_CODE,
    E2E_CATEGORY_SLUG,
    E2E_PRODUCT_SLUG,
    E2E_SHIPPING_NAME,
  } = await import("./support");
  const prisma = db();
  if (existsSync(ADMIN_BACKUP)) {
    const { passwordHash } = JSON.parse(readFileSync(ADMIN_BACKUP, "utf8")) as {
      passwordHash: string | null;
    };
    await prisma.user.update({
      where: { phone: ADMIN_PHONE },
      data: { passwordHash },
    });
    rmSync(ADMIN_BACKUP);
  }
  const user = await prisma.user.findUnique({
    where: { phone: CUSTOMER_PHONE },
  });
  if (user) {
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    const payments = await prisma.payment.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true },
    });
    // لاگ‌های ممیزی خود مشتری و تأیید ادمین روی پرداخت‌های همین سفارش‌ها
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: user.id },
          { entityId: { in: [...orderIds, ...payments.map((p) => p.id)] } },
        ],
      },
    });
    await prisma.notificationLog.deleteMany({ where: { userId: user.id } });
    await prisma.walletTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  if (existsSync(SHIPPING_BACKUP)) {
    const rows = JSON.parse(readFileSync(SHIPPING_BACKUP, "utf8")) as {
      id: string;
      [key: string]: unknown;
    }[];
    for (const { id, ...data } of rows) {
      await prisma.shippingMethod.update({
        where: { id },
        data: data as Prisma.ShippingMethodUpdateInput,
      });
    }
    rmSync(SHIPPING_BACKUP);
  }
  if (existsSync(SMS_CONNECTION_BACKUP)) {
    const { value } = JSON.parse(
      readFileSync(SMS_CONNECTION_BACKUP, "utf8"),
    ) as { value: Prisma.InputJsonValue | null };
    await prisma.setting.deleteMany({ where: { key: "sms.connection" } });
    if (value !== null) {
      await prisma.setting.create({ data: { key: "sms.connection", value } });
    }
    rmSync(SMS_CONNECTION_BACKUP);
  }
  await prisma.shippingMethod.deleteMany({
    where: { name: E2E_SHIPPING_NAME },
  });
  await prisma.coupon.deleteMany({ where: { code: COUPON_CODE } });
  await prisma.product.deleteMany({ where: { slug: E2E_PRODUCT_SLUG } });
  await prisma.category.deleteMany({ where: { slug: E2E_CATEGORY_SLUG } });
  await prisma.rateLimitEvent.deleteMany({});
  await prisma.$disconnect();
  rmSync(E2E_TMP, { recursive: true, force: true });
}
