import type { Metadata } from "next";

import { CartPageView } from "@/components/shop/cart/CartPageView";
import { getCurrentUser } from "@/server/auth/current-user";
import { cartOwner } from "@/server/cart-cookie";
import { getCartView } from "@/server/services/cart.service";

export const metadata: Metadata = {
  title: "سبد خرید",
  robots: { index: false },
};

/** سبد همیشه پویا است (به کوکی و کاربر وابسته) و قیمت‌ها از دیتابیس خوانده می‌شوند. */
export default async function CartPage() {
  const user = await getCurrentUser();
  const cart = await getCartView(await cartOwner(user?.id ?? null));
  return <CartPageView initial={cart} />;
}
