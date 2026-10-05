import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { findUserById } from "@/server/repositories/user.repository";

import { SESSION_COOKIE_NAME } from "./cookie";
import { type ResolvedSession, resolveSession } from "./session";

/** DTO امن؛ هرگز رکورد خام Prisma به بیرون نمی‌رود. */
export interface CurrentUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: UserRole;
}

export interface SessionUser {
  user: CurrentUser;
  session: ResolvedSession;
  hasPassword: boolean;
}

/**
 * نشست معتبر + کاربر فعال، حتی اگر هنوز رمز تعیین نکرده باشد. فقط صفحه‌ی
 * «تعیین رمز عبور» و صفحه‌ی ورود از آن استفاده می‌کنند.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await resolveSession(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || !user.isActive) return null;

  return {
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
    },
    session,
    hasPassword: user.passwordHash !== null,
  };
});

/**
 * کاربر فعلی یا `null`؛ نقش و وضعیت از دیتابیس خوانده می‌شود نه از JWT.
 * تعیین رمز عبور **اختیاری** است: کاربری که با کد پیامکی ثبت‌نام کرده و رمز
 * نگذاشته هم واردشده حساب می‌شود (بعد از ورود از او پرسیده می‌شود، صفحه‌ی
 * `/set-password`؛ «بعداً» مجاز است).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const current = await getSessionUser();
  return current?.user ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** بدون ورود ⇒ /login؛ کاربر عادی ⇒ صفحه‌ی اصلی. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
