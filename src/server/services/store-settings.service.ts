import { db } from "@/lib/db";
import type { SiteSettings } from "@/lib/site-settings";
import type {
  BankCardInput,
  GeneralSettingsInput,
  ShippingMethodInput,
} from "@/lib/validation/settings";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  findBankCard,
  listAllBankCards,
} from "@/server/repositories/bank-card.repository";
import { upsertSetting } from "@/server/repositories/setting.repository";
import {
  findShippingMethod,
  listAllShippingMethods,
} from "@/server/repositories/shipping.repository";

import { getMaxQuantityPerItem } from "./settings.service";
import { getSiteSettings, saveSiteSettings } from "./site-settings.service";

/**
 * تنظیمات فروشگاه (ادمین). تغییر کارت بانکی و روش ارسال مستقیماً روی پول
 * مشتری اثر دارد، پس هر تغییر در AuditLog ثبت می‌شود.
 */

/** فقط ۴ رقم آخر در لاگ ممیزی (شماره‌ی کامل در خود رکورد هست) */
function maskCard(cardNumber: string): string {
  return `****${cardNumber.slice(-4)}`;
}

// ───────── عمومی ─────────

export async function getGeneralSettings(): Promise<{
  maxQuantityPerItem: number;
  site: SiteSettings;
}> {
  const [maxQuantityPerItem, site] = await Promise.all([
    getMaxQuantityPerItem(),
    getSiteSettings(),
  ]);
  return { maxQuantityPerItem, site };
}

export async function saveGeneralSettings(
  adminId: string,
  input: GeneralSettingsInput,
): Promise<void> {
  const current = await getSiteSettings();
  await saveSiteSettings({
    ...current,
    contact: input.contact,
    social: input.social,
    trustItems: input.trustItems,
    aboutStats: input.aboutStats,
    shippingNote: input.shippingNote,
    enamad: input.enamad,
  });
  await upsertSetting("maxQuantityPerItem", input.maxQuantityPerItem);
  await db.$transaction((tx) =>
    createAuditLog(tx, {
      actorUserId: adminId,
      action: "settings.general_updated",
      entityType: "User",
      entityId: adminId,
      metadata: { maxQuantityPerItem: input.maxQuantityPerItem },
    }),
  );
}

// ───────── کارت‌های بانکی ─────────

export function listBankCards() {
  return listAllBankCards();
}

export async function saveBankCard(
  adminId: string,
  id: string | null,
  input: BankCardInput,
): Promise<void> {
  await db.$transaction(async (tx) => {
    let cardId = id;
    if (id) {
      const before = await findBankCard(id);
      if (!before) throw new UserFacingError("کارت پیدا نشد.");
      await tx.companyBankCard.update({ where: { id }, data: input });
    } else {
      cardId = (await tx.companyBankCard.create({ data: input })).id;
    }
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: id ? "settings.bank_card_updated" : "settings.bank_card_created",
      entityType: "User",
      entityId: adminId,
      metadata: {
        bankCardId: cardId,
        bankName: input.bankName,
        card: maskCard(input.cardNumber),
        isActive: input.isActive,
      },
    });
  });
}

export async function deleteBankCard(adminId: string, id: string) {
  await db.$transaction(async (tx) => {
    const card = await tx.companyBankCard.findUnique({ where: { id } });
    if (!card) throw new UserFacingError("کارت پیدا نشد.");
    await tx.companyBankCard.delete({ where: { id } });
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: "settings.bank_card_deleted",
      entityType: "User",
      entityId: adminId,
      metadata: { bankName: card.bankName, card: maskCard(card.cardNumber) },
    });
  });
}

// ───────── روش‌های ارسال ─────────

export function listShippingMethods() {
  return listAllShippingMethods();
}

export async function saveShippingMethod(
  adminId: string,
  id: string | null,
  input: ShippingMethodInput,
): Promise<void> {
  await db.$transaction(async (tx) => {
    let methodId = id;
    if (id) {
      if (!(await findShippingMethod(id))) {
        throw new UserFacingError("روش ارسال پیدا نشد.");
      }
      await tx.shippingMethod.update({ where: { id }, data: input });
    } else {
      methodId = (await tx.shippingMethod.create({ data: input })).id;
    }
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: id ? "settings.shipping_updated" : "settings.shipping_created",
      entityType: "User",
      entityId: adminId,
      metadata: {
        shippingMethodId: methodId,
        name: input.name,
        cost: input.cost,
        freeAboveAmount: input.freeAboveAmount,
        freeAboveQuantity: input.freeAboveQuantity,
        requiresAddress: input.requiresAddress,
        deliveryEstimate: input.deliveryEstimate,
        businessHoursOnly: input.businessHoursOnly,
      },
    });
  });
}

/** سفارش‌ها نام روش را اسنپ‌شات دارند؛ حذف روش سفارش قدیمی را نمی‌شکند */
export async function deleteShippingMethod(adminId: string, id: string) {
  await db.$transaction(async (tx) => {
    const method = await tx.shippingMethod.findUnique({ where: { id } });
    if (!method) throw new UserFacingError("روش ارسال پیدا نشد.");
    await tx.shippingMethod.delete({ where: { id } });
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: "settings.shipping_deleted",
      entityType: "User",
      entityId: adminId,
      metadata: { name: method.name },
    });
  });
}
