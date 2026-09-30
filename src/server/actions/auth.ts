"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  type PasswordLoginInput,
  passwordLoginSchema,
  type RequestOtpInput,
  requestOtpSchema,
  type SetPasswordInput,
  setPasswordSchema,
  type VerifyOtpInput,
  verifyOtpSchema,
} from "@/lib/validation/auth";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/server/auth/cookie";
import { getSessionUser } from "@/server/auth/current-user";
import { getClientIp } from "@/server/auth/request";
import { endSession } from "@/server/auth/session";
import { cartOwner, clearCartToken } from "@/server/cart-cookie";
import {
  loginWithOtp,
  loginWithPassword,
  startLogin,
} from "@/server/services/auth.service";
import { mergeGuestCart } from "@/server/services/cart.service";
import { requestOtp } from "@/server/services/otp.service";
import { setOwnPassword } from "@/server/services/password.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/**
 * ورود عمومی است (احراز هویت لازم ندارد)؛ ترتیب: Zod → service → خروجی typed.
 * جریان: شماره ⇒ (رمز عبور | کد پیامکی) ⇒ کاربر بدون رمز ⇒ `/set-password`.
 */

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? INVALID_INPUT_MESSAGE;
}

/** گام اول: کاربر رمزدار ⇒ `PASSWORD`؛ وگرنه کد پیامکی همین حالا ارسال می‌شود. */
export async function startLoginAction(
  input: RequestOtpInput,
): Promise<
  ActionResult<{ method: "PASSWORD" | "OTP"; expiresInSeconds?: number }>
> {
  const parsed = requestOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const ip = getClientIp(await headers());
  const result = await startLogin({ phone: parsed.data.phone, ip });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      retryAfterSeconds:
        "retryAfterSeconds" in result ? result.retryAfterSeconds : undefined,
    };
  }
  return result.method === "OTP"
    ? { ok: true, method: "OTP", expiresInSeconds: result.expiresInSeconds }
    : { ok: true, method: "PASSWORD" };
}

/** ارسال (مجدد) کد؛ برای «ورود با کد پیامکی» و «فراموشی رمز» هم */
export async function requestOtpAction(
  input: RequestOtpInput,
): Promise<ActionResult<{ expiresInSeconds: number }>> {
  const parsed = requestOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const ip = getClientIp(await headers());
  const result = await requestOtp({ phone: parsed.data.phone, ip });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }
  return { ok: true, expiresInSeconds: result.expiresInSeconds };
}

/** سبد مهمان در سبد کاربر ادغام می‌شود و کوکی نشست ست می‌شود. */
async function completeLogin(session: {
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await mergeGuestCart(await cartOwner(session.userId));
  await clearCartToken();
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    session.token,
    sessionCookieOptions(session.expiresAt),
  );
  revalidatePath("/", "layout");
}

/** تأیید OTP و ورود؛ `needsPassword` ⇒ کاربر باید به `/set-password` برود. */
export async function verifyOtpAction(
  input: VerifyOtpInput,
): Promise<ActionResult<{ needsPassword: boolean }>> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const userAgent = (await headers()).get("user-agent");
  const result = await loginWithOtp({ ...parsed.data, userAgent });
  if (!result.ok) return { ok: false, message: result.message };

  await completeLogin(result);
  return { ok: true, needsPassword: result.needsPassword };
}

export async function passwordLoginAction(
  input: PasswordLoginInput,
): Promise<ActionResult> {
  const parsed = passwordLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const requestHeaders = await headers();
  const result = await loginWithPassword({
    ...parsed.data,
    ip: getClientIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
  });
  if (!result.ok) return { ok: false, message: result.message };

  await completeLogin(result);
  return { ok: true };
}

/** تعیین رمز (ثبت‌نام/فراموشی) یا تغییر آن؛ کاربرِ بدون رمز هم مجاز است. */
export async function setPasswordAction(
  input: SetPasswordInput,
): Promise<ActionResult> {
  const current = await getSessionUser();
  if (!current) {
    return { ok: false, message: "نشست شما منقضی شده است. دوباره وارد شوید." };
  }
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await setOwnPassword({
      userId: current.user.id,
      session: current.session,
      currentPassword: parsed.data.currentPassword,
      password: parsed.data.password,
    });
    revalidatePath("/", "layout");
    return {};
  });
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) await endSession(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath("/", "layout");
  redirect("/");
}
