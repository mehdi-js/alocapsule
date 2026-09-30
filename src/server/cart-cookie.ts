import { cookies } from "next/headers";

import type { CartOwner } from "@/server/services/cart.service";

export const CART_COOKIE_NAME = "cart_token";
/** ۳۰ روز */
const CART_TTL_SECONDS = 30 * 24 * 60 * 60;

/** توکن تصادفی ۲۴ بایتی base64url؛ مقدار دستکاری‌شده ارزشی ندارد */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export async function readCartToken(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE_NAME)?.value;
  return value && TOKEN_PATTERN.test(value) ? value : null;
}

/** فقط در Server Action / Route Handler قابل فراخوانی است */
export async function writeCartToken(token: string): Promise<void> {
  (await cookies()).set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_TTL_SECONDS,
  });
}

export async function clearCartToken(): Promise<void> {
  (await cookies()).delete(CART_COOKIE_NAME);
}

export async function cartOwner(userId: string | null): Promise<CartOwner> {
  return { userId, token: await readCartToken() };
}
