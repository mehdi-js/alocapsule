"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DEFAULT_MAINTENANCE_MESSAGE } from "@/lib/maintenance";
import { type BannersFormInput, bannersSchema } from "@/lib/validation/banners";
import {
  type BankCardFormInput,
  bankCardSchema,
  type GeneralSettingsFormInput,
  generalSettingsSchema,
  type MaintenanceInput,
  maintenanceSchema,
  type ShippingMethodFormInput,
  shippingMethodSchema,
} from "@/lib/validation/settings";
import {
  type BusinessSettingsFormInput,
  businessSettingsSchema,
  type HomeSettingsFormInput,
  homeSettingsSchema,
} from "@/lib/validation/store-content";
import { requireAdmin } from "@/server/auth/current-user";
import { saveBanners } from "@/server/services/banner.service";
import { setMaintenance } from "@/server/services/maintenance.service";
import {
  saveBusinessSettings,
  saveHomeSettings,
} from "@/server/services/store-content.service";
import {
  deleteBankCard,
  deleteShippingMethod,
  saveBankCard,
  saveGeneralSettings,
  saveShippingMethod,
} from "@/server/services/store-settings.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  revalidateCatalog,
  runAction,
  validationFailure,
} from "./types";

/**
 * تنظیمات فروشگاه (ادمین). ترتیب: نقش ← Zod ← service ← revalidate.
 * محتوای سایت در همه‌ی صفحات فروشگاه (هدر/فوتر) است ⇒ revalidate کل لایه.
 */

const optionalId = z.string().min(1).max(64).nullable();

function revalidateSettings(): void {
  revalidatePath("/admin/settings", "layout");
  revalidateCatalog();
}

export async function saveGeneralSettingsAction(
  input: GeneralSettingsFormInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    await saveGeneralSettings(admin.id, parsed.data);
    revalidateSettings();
    return {};
  });
}

export async function saveBusinessSettingsAction(
  input: BusinessSettingsFormInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = businessSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    await saveBusinessSettings(admin.id, parsed.data);
    revalidateSettings();
    revalidatePath("/checkout");
    return {};
  });
}

export async function saveHomeSettingsAction(
  input: HomeSettingsFormInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = homeSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    await saveHomeSettings(admin.id, parsed.data);
    revalidateSettings();
    return {};
  });
}

export async function saveBankCardAction(
  id: string | null,
  input: BankCardFormInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsedId = optionalId.safeParse(id);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsed = bankCardSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    await saveBankCard(admin.id, parsedId.data, parsed.data);
    revalidateSettings();
    revalidatePath("/checkout/pay/[orderNumber]", "page");
    return {};
  });
}

export async function deleteBankCardAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsedId = z.string().min(1).max(64).safeParse(id);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  return runAction(async () => {
    await deleteBankCard(admin.id, parsedId.data);
    revalidateSettings();
    return {};
  });
}

export async function saveShippingMethodAction(
  id: string | null,
  input: ShippingMethodFormInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsedId = optionalId.safeParse(id);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsed = shippingMethodSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    await saveShippingMethod(admin.id, parsedId.data, parsed.data);
    revalidateSettings();
    revalidatePath("/checkout");
    return {};
  });
}

export async function deleteShippingMethodAction(
  id: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsedId = z.string().min(1).max(64).safeParse(id);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  return runAction(async () => {
    await deleteShippingMethod(admin.id, parsedId.data);
    revalidateSettings();
    return {};
  });
}

export async function saveMaintenanceAction(
  input: MaintenanceInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = maintenanceSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await setMaintenance(admin.id, {
      enabled: parsed.data.enabled,
      message: parsed.data.message || DEFAULT_MAINTENANCE_MESSAGE,
    });
    revalidatePath("/admin", "layout");
    return {};
  });
}

export async function saveBannersAction(
  input: BannersFormInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = bannersSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await saveBanners(admin.id, parsed.data);
    revalidateSettings();
    return {};
  });
}
