"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type SmsConnectionInput,
  smsConnectionSchema,
  type SmsSettingsFormInput,
  smsSettingsSchema,
} from "@/lib/validation/sms-settings";
import { requireAdmin } from "@/server/auth/current-user";
import { findNotificationLog } from "@/server/repositories/notification.repository";
import { retryNotification } from "@/server/services/notification.service";
import {
  checkMelipayamakCredit,
  checkMelipayamakDelivery,
  saveSmsConnection,
} from "@/server/services/sms-connection.service";
import { saveSmsSettings } from "@/server/services/sms-settings.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/** پیامک‌ها (ادمین): تلاش دوباره‌ی دستی و تنظیمات متن/الگو */

export async function retryNotificationAction(
  logId: string,
): Promise<ActionResult<{ retried: boolean }>> {
  await requireAdmin();
  const id = z.string().min(1).max(64).safeParse(logId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    const retried = await retryNotification(id.data);
    revalidatePath("/admin/notifications", "layout");
    revalidatePath("/admin/orders", "layout");
    return { retried };
  });
}

export async function saveSmsSettingsAction(
  input: SmsSettingsFormInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = smsSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await saveSmsSettings(parsed.data);
    revalidatePath("/admin/notifications", "layout");
    return {};
  });
}

export async function saveSmsConnectionAction(
  input: SmsConnectionInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = smsConnectionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await saveSmsConnection(admin.id, parsed.data);
    revalidatePath("/admin/notifications", "layout");
    revalidatePath("/admin/settings", "layout");
    return {};
  });
}

/** بررسی اتصال ملی پیامک (اعتبار پنل) با مقادیر فرم، پیش از ذخیره */
export async function checkSmsCreditAction(input: {
  username: string;
  password: string;
}): Promise<ActionResult<{ credit: number }>> {
  await requireAdmin();
  const parsed = smsConnectionSchema
    .pick({ username: true, newPassword: true })
    .safeParse({ username: input.username, newPassword: input.password });
  if (!parsed.success) return validationFailure(parsed.error);

  const result = await checkMelipayamakCredit({
    username: parsed.data.username,
    password: parsed.data.newPassword,
  });
  return result.ok
    ? { ok: true, credit: result.credit }
    : { ok: false, message: result.message };
}

/** «وضعیت تحویل» یک پیامک ارسال‌شده از ملی پیامک */
export async function checkDeliveryAction(
  logId: string,
): Promise<ActionResult<{ label: string }>> {
  await requireAdmin();
  if (!z.string().min(1).safeParse(logId).success) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  const log = await findNotificationLog(logId);
  const recId = log?.providerMessageId ?? "";
  if (!/^\d{10,}$/.test(recId)) {
    return {
      ok: false,
      message: "برای این پیامک شناسه‌ی ارسال ملی پیامک ثبت نشده است.",
    };
  }
  const result = await checkMelipayamakDelivery(recId);
  return result.ok
    ? { ok: true, label: result.label }
    : { ok: false, message: result.message };
}
