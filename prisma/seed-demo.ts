/**
 * داده‌ی نمایشی گزارش‌ها (فقط توسعه): چند مشتری و سفارش با وضعیت‌ها و
 * تاریخ‌های مختلف در ۴۵ روز اخیر تا داشبورد و گزارش‌ها قابل بررسی باشند.
 *
 * - npm run db:seed:demo          ⇒ پاک‌سازی داده‌ی نمایشی قبلی + ساخت دوباره
 * - npm run db:seed:demo -- --clean ⇒ فقط پاک‌سازی
 *
 * 🔴 در production اجرا نمی‌شود. شماره‌ی سفارش‌ها `DEMO-…` است تا با
 * شماره‌گذاری واقعی `{order.numberPrefix}-…` تداخل نداشته باشد. در پایان جمع دستی فروش ۳۰ روز
 * اخیر چاپ می‌شود تا با داشبورد مقایسه شود.
 */
import { type OrderStatus, PrismaClient } from "@prisma/client";

import { addTehranDays, formatJalali, startOfTehranDay } from "@/lib/date";
import { resolveVariantTitle } from "@/lib/unit";

const prisma = new PrismaClient();

const DEMO_PHONE_PREFIX = "099800000";
const DEMO_ORDER_PREFIX = "DEMO-";
const DEMO_COUPON = "DEMO10";
const CUSTOMERS = 6;
const DAYS = 45;

/** تصادفی قابل تکرار (LCG) تا هر اجرا همان داده را بسازد */
function random(seed: number) {
  let state = seed;
  return (max: number) => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    // بیت‌های بالا (بیت‌های پایین LCG دوره‌ی کوتاهی دارند)
    return Math.floor((state / 2_147_483_648) * max);
  };
}

async function clean(): Promise<void> {
  const orders = await prisma.order.deleteMany({
    where: { orderNumber: { startsWith: DEMO_ORDER_PREFIX } },
  });
  const users = await prisma.user.deleteMany({
    where: { phone: { startsWith: DEMO_PHONE_PREFIX } },
  });
  await prisma.coupon.deleteMany({ where: { code: DEMO_COUPON } });
  console.log(
    `پاک‌سازی: ${orders.count} سفارش و ${users.count} مشتری نمایشی حذف شد.`,
  );
}

const STATUSES: { status: OrderStatus; paid: boolean; weight: number }[] = [
  { status: "DELIVERED", paid: true, weight: 5 },
  { status: "SHIPPED", paid: true, weight: 2 },
  { status: "PROCESSING", paid: true, weight: 2 },
  { status: "PAYMENT_REVIEW", paid: false, weight: 1 },
  { status: "PENDING_PAYMENT", paid: false, weight: 1 },
  { status: "PAYMENT_REJECTED", paid: false, weight: 1 },
  { status: "CANCELED", paid: false, weight: 1 },
];

function pickStatus(rand: (max: number) => number) {
  const total = STATUSES.reduce((sum, s) => sum + s.weight, 0);
  let roll = rand(total);
  for (const entry of STATUSES) {
    if (roll < entry.weight) return entry;
    roll -= entry.weight;
  }
  return STATUSES[0]!;
}

async function seed(): Promise<void> {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { isActive: true } },
    include: { product: true },
    orderBy: { id: "asc" },
  });
  if (variants.length === 0) {
    throw new Error("ابتدا npm run db:seed را اجرا کنید (محصولی نیست).");
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: DEMO_COUPON,
      title: "کد نمایشی ۱۰٪",
      type: "PERCENT",
      value: 10,
      isActive: false,
    },
  });

  const customers = [];
  for (let i = 1; i <= CUSTOMERS; i++) {
    customers.push(
      await prisma.user.create({
        data: {
          phone: `${DEMO_PHONE_PREFIX}${String(i).padStart(2, "0")}`,
          fullName: `مشتری نمایشی ${i}`,
        },
      }),
    );
  }

  const rand = random(1405);
  const today = startOfTehranDay(new Date());
  const thirtyDaysAgo = addTehranDays(today, -29);
  let created = 0;
  let manualSales = 0;
  let manualOrders = 0;

  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
    const day = addTehranDays(today, -dayOffset);
    const count = rand(3); // ۰ تا ۲ سفارش در روز
    for (let n = 0; n < count; n++) {
      const customer = customers[rand(customers.length)]!;
      const { status, paid } = pickStatus(rand);
      // ساعت ۹ تا ۲۲ تهران
      const placedAt = new Date(
        day.getTime() + (9 + rand(13)) * 3_600_000 + rand(60) * 60_000,
      );
      if (placedAt > new Date()) continue;

      const lines = Array.from({ length: 1 + rand(3) }, () => {
        const variant = variants[rand(variants.length)]!;
        const quantity = 1 + rand(3);
        return {
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.product.name,
          variantTitle: resolveVariantTitle(
            variant.product.unit,
            variant.unitValue,
            variant.title,
          ),
          unitPrice: variant.price,
          quantity,
          lineTotal: variant.price * quantity,
          unitValueSnapshot: variant.unitValue,
          unitSnapshot: variant.product.unit,
        };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const withCoupon = rand(4) === 0;
      const discountTotal = withCoupon
        ? Math.floor((subtotal * 0.1) / 1000) * 1000
        : 0;
      const shippingTotal = subtotal - discountTotal >= 3_000_000 ? 0 : 90_000;
      const grandTotal = subtotal + shippingTotal - discountTotal;

      created++;
      const order = await prisma.order.create({
        data: {
          orderNumber: `${DEMO_ORDER_PREFIX}${formatJalali(placedAt, "YYYYMMDD", { digits: "en" })}-${String(created).padStart(3, "0")}`,
          userId: customer.id,
          status,
          subtotal,
          shippingTotal,
          discountTotal,
          grandTotal,
          couponId: withCoupon ? coupon.id : null,
          couponCode: withCoupon ? DEMO_COUPON : null,
          shippingMethodName: "پست پیشتاز",
          shippingAddressSnapshot: {
            receiverName: customer.fullName,
            receiverPhone: customer.phone,
            province: "تهران",
            city: "تهران",
            postalCode: null,
            line: "نشانی نمایشی، پلاک ۱",
          },
          placedAt,
          paidAt: paid ? new Date(placedAt.getTime() + 3_600_000) : null,
          shippedAt:
            status === "SHIPPED" || status === "DELIVERED"
              ? new Date(placedAt.getTime() + 86_400_000)
              : null,
          canceledAt: status === "CANCELED" ? placedAt : null,
          trackingCode:
            status === "SHIPPED" || status === "DELIVERED"
              ? `DEMO${created}`
              : null,
          items: { create: lines },
          payments: {
            create: {
              method: "CARD_TO_CARD",
              amount: grandTotal,
              status: paid
                ? "APPROVED"
                : status === "PAYMENT_REVIEW"
                  ? "SUBMITTED"
                  : status === "PAYMENT_REJECTED"
                    ? "REJECTED"
                    : "PENDING",
            },
          },
          statusHistory: { create: { toStatus: status } },
        },
      });
      // سفارش لغوشده کد را آزاد کرده است (بند ۷.۳)
      if (withCoupon && status !== "CANCELED") {
        await prisma.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId: customer.id,
            orderId: order.id,
            discountAmount: discountTotal,
          },
        });
      }
      // جمع دستی برای مقایسه با داشبورد (۳۰ روز اخیر)
      if (paid && status !== "CANCELED" && placedAt >= thirtyDaysAgo) {
        manualSales += grandTotal;
        manualOrders++;
      }
    }
  }

  await prisma.coupon.update({
    where: { id: coupon.id },
    data: {
      usedCount: await prisma.couponRedemption.count({
        where: { couponId: coupon.id },
      }),
    },
  });

  console.log(`${created} سفارش نمایشی برای ${CUSTOMERS} مشتری ساخته شد.`);
  console.log(
    `جمع دستی «۳۰ روز اخیر»: فروش ${manualSales.toLocaleString("en-US")} تومان در ${manualOrders} سفارش — باید با داشبورد یکی باشد.`,
  );
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed نمایشی در production اجرا نمی‌شود.");
  }
  await clean();
  if (!process.argv.includes("--clean")) await seed();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
