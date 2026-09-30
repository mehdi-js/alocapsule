import { db, type DbClient } from "@/lib/db";

/** همه‌ی کوئری‌ها به `userId` محدودند؛ آدرس کاربر دیگر هرگز خوانده یا تغییر نمی‌کند. */

const addressSelect = {
  id: true,
  receiverName: true,
  receiverPhone: true,
  province: true,
  city: true,
  postalCode: true,
  line: true,
  isDefault: true,
} as const;

export interface AddressWriteData {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode: string | null;
  line: string;
}

export function listUserAddresses(userId: string) {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    select: addressSelect,
  });
}

export function findUserAddress(
  id: string,
  userId: string,
  client: DbClient = db,
) {
  return client.address.findFirst({
    where: { id, userId },
    select: addressSelect,
  });
}

export function countUserAddresses(userId: string) {
  return db.address.count({ where: { userId } });
}

/** ساخت آدرس؛ اگر پیش‌فرض است، پیش‌فرض قبلی در همان تراکنش برداشته می‌شود */
export function createAddressRecord(
  userId: string,
  data: AddressWriteData,
  isDefault: boolean,
) {
  return db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: { ...data, userId, isDefault },
      select: addressSelect,
    });
  });
}

export function updateAddressRecord(
  id: string,
  userId: string,
  data: AddressWriteData,
  isDefault: boolean,
) {
  return db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    const { count } = await tx.address.updateMany({
      where: { id, userId },
      data: { ...data, isDefault },
    });
    return count > 0;
  });
}

export function setDefaultAddressRecord(id: string, userId: string) {
  return db.$transaction(async (tx) => {
    const target = await tx.address.findFirst({ where: { id, userId } });
    if (!target) return false;
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
    return true;
  });
}

/**
 * حذف آدرس. اگر پیش‌فرض بود، جدیدترین آدرس باقی‌مانده پیش‌فرض می‌شود.
 * سفارش‌ها اسنپ‌شات آدرس دارند و از این حذف اثر نمی‌گیرند.
 */
export function deleteAddressRecord(id: string, userId: string) {
  return db.$transaction(async (tx) => {
    const target = await tx.address.findFirst({ where: { id, userId } });
    if (!target) return false;
    await tx.address.delete({ where: { id } });
    if (target.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { id: "desc" },
        select: { id: true },
      });
      if (next) {
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return true;
  });
}
