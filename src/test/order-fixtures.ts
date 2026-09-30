import { randomBytes, randomInt } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import type { Prisma } from "@prisma/client";
import sharp from "sharp";

import { db } from "@/lib/db";
import { priceOrder } from "@/lib/order-pricing";
import { privateStorageDir } from "@/lib/storage/private";
import {
  createWalletTransaction,
  creditBalance,
} from "@/server/repositories/wallet.repository";
import { addToCart, getCartView } from "@/server/services/cart.service";
import { createOrder } from "@/server/services/order.service";

/**
 * داده‌ی تست یکپارچه‌ی سفارش. هر اجرا شناسه‌ی یکتای خودش را دارد و
 * `cleanupFixtures()` همه‌ی ردیف‌های ساخته‌شده را پاک می‌کند.
 */

const RUN = randomBytes(3).toString("hex");

const created = {
  userIds: new Set<string>(),
  couponIds: new Set<string>(),
  shippingIds: new Set<string>(),
  categoryId: null as string | null,
  productId: null as string | null,
};

export interface Catalog {
  /** ۵۰۰ گرم — ۴۰۰٬۰۰۰ تومان */
  small: string;
  /** ۱ کیلوگرم — ۷۵۰٬۰۰۰ تومان */
  large: string;
  productId: string;
  categoryId: string;
  /** پست: ۹۰٬۰۰۰، رایگان از ۳٬۰۰۰٬۰۰۰ (همه‌ی مناطق) */
  post: { id: string; cost: number; freeAboveAmount: number | null };
  /** پیک فقط تهران: ۶۰٬۰۰۰ بدون آستانه */
  courier: { id: string; cost: number; freeAboveAmount: number | null };
}

export async function createCatalog(): Promise<Catalog> {
  const category = await db.category.create({
    data: {
      name: `دسته‌ی تست ${RUN}`,
      slug: `int-test-${RUN}`,
      isActive: false,
    },
  });
  const product = await db.product.create({
    data: {
      name: `محصول تست ${RUN}`,
      slug: `int-test-product-${RUN}`,
      categoryId: category.id,
      unit: "GRAM",
      variants: {
        create: [
          { unitValue: 500, price: 400_000, shippingWeightGrams: 600 },
          { unitValue: 1000, price: 750_000, shippingWeightGrams: 1100 },
        ],
      },
    },
    include: { variants: { orderBy: { unitValue: "asc" } } },
  });
  created.categoryId = category.id;
  created.productId = product.id;

  const post = await db.shippingMethod.create({
    data: { name: `پست تست ${RUN}`, cost: 90_000, freeAboveAmount: 3_000_000 },
  });
  const courier = await db.shippingMethod.create({
    data: { name: `پیک تست ${RUN}`, cost: 60_000, provinces: ["تهران"] },
  });
  created.shippingIds.add(post.id).add(courier.id);

  const [small, large] = product.variants;
  if (!small || !large) throw new Error("fixture variants missing");
  return {
    small: small.id,
    large: large.id,
    productId: product.id,
    categoryId: category.id,
    post,
    courier,
  };
}

export interface Customer {
  userId: string;
  addressId: string;
  owner: { userId: string; token: null };
}

export async function createCustomer(
  address: Partial<Prisma.AddressUncheckedCreateInput> = {},
): Promise<Customer> {
  const user = await db.user.create({ data: { phone: testPhone() } });
  created.userIds.add(user.id);
  const saved = await db.address.create({
    data: {
      userId: user.id,
      receiverName: "گیرنده‌ی تست",
      receiverPhone: "09121234567",
      province: "تهران",
      city: "تهران",
      line: "خیابان آزمایش، پلاک ۱",
      isDefault: true,
      ...address,
    },
  });
  return {
    userId: user.id,
    addressId: saved.id,
    owner: { userId: user.id, token: null },
  };
}

export async function fillCart(
  customer: Customer,
  lines: [variantId: string, quantity: number][],
  couponCode: string | null = null,
): Promise<void> {
  for (const [variantId, quantity] of lines) {
    await addToCart(customer.owner, variantId, quantity);
  }
  await db.cart.updateMany({
    where: { userId: customer.userId },
    data: { couponCode },
  });
}

export async function createCoupon(
  data: Omit<Prisma.CouponUncheckedCreateInput, "code" | "title"> & {
    code?: string;
  },
) {
  const coupon = await db.coupon.create({
    data: {
      title: "کد تست",
      ...data,
      code: data.code ?? `INT${RUN}${randomInt(0, 1_000_000)}`.toUpperCase(),
    },
  });
  created.couponIds.add(coupon.id);
  return coupon;
}

/** همان محاسبه‌ای که صفحه‌ی تسویه در کلاینت انجام می‌دهد */
export async function quote(
  customer: Customer,
  shipping: { cost: number; freeAboveAmount: number | null },
): Promise<number> {
  const cart = await getCartView(customer.owner);
  const coupon = cart.coupon && !cart.coupon.error ? cart.coupon : null;
  return priceOrder({
    subtotal: cart.subtotal,
    itemsDiscount: coupon?.discount ?? 0,
    freeShippingCoupon: coupon?.freeShipping ?? false,
    shipping,
  }).grandTotal;
}

/** ثبت سفارش با مبلغی که صفحه‌ی تسویه نشان می‌داد (مگر خلافش داده شود) */
export async function placeOrder(
  customer: Customer,
  shipping: { id: string; cost: number; freeAboveAmount: number | null },
  overrides: { expectedGrandTotal?: number; customerNote?: string | null } = {},
) {
  const expectedGrandTotal =
    overrides.expectedGrandTotal ?? (await quote(customer, shipping));
  return createOrder(customer.owner, {
    addressId: customer.addressId,
    shippingMethodId: shipping.id,
    customerNote: overrides.customerNote ?? null,
    expectedGrandTotal,
  });
}

export function ordersOf(userId: string) {
  return db.order.findMany({
    where: { userId },
    include: {
      items: true,
      payments: true,
      statusHistory: true,
      couponRedemptions: true,
    },
  });
}

/** شماره‌ی موبایل یکتای تست (پیشوند 0999) */
function testPhone(): string {
  return `0999${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
}

export async function createAdmin(): Promise<string> {
  const admin = await db.user.create({
    data: { phone: testPhone(), role: "ADMIN" },
  });
  created.userIds.add(admin.id);
  return admin.id;
}

/** شارژ کیف پول برای تست (ledger + کش در یک تراکنش، مثل شارژ ادمین) */
export async function creditWallet(userId: string, amount: number) {
  await db.$transaction(async (tx) => {
    const balanceAfter = await creditBalance(tx, userId, amount);
    await createWalletTransaction(tx, {
      userId,
      type: "CREDIT",
      amount,
      balanceAfter,
      reason: "ADMIN_CREDIT",
      orderId: null,
      createdByUserId: null,
      note: "شارژ تست",
    });
  });
}

/** تصویر PNG کوچک و معتبر به‌جای عکس رسید */
export function receiptPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 64,
      height: 48,
      channels: 3,
      background: { r: 240, g: 240, b: 230 },
    },
  })
    .png()
    .toBuffer();
}

export async function cleanupFixtures(): Promise<void> {
  const userIds = [...created.userIds];
  await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await db.notificationLog.deleteMany({ where: { userId: { in: userIds } } });
  await db.walletTransaction.deleteMany({ where: { userId: { in: userIds } } });
  await db.order.deleteMany({ where: { userId: { in: userIds } } });
  await db.cart.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.coupon.deleteMany({ where: { id: { in: [...created.couponIds] } } });
  await db.shippingMethod.deleteMany({
    where: { id: { in: [...created.shippingIds] } },
  });
  if (created.productId) {
    await db.product.delete({ where: { id: created.productId } });
  }
  if (created.categoryId) {
    await db.category.delete({ where: { id: created.categoryId } });
  }
  // فقط پوشه‌ی خصوصیِ موقتِ تست پاک می‌شود، هرگز پوشه‌ی واقعی
  const dir = privateStorageDir();
  if (dir.startsWith(tmpdir())) await rm(dir, { recursive: true, force: true });
  await db.$disconnect();
}
