"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useToast } from "@/components/ui/Toast";
import {
  addToCartAction,
  applyCouponAction,
  getCartAction,
  removeCartItemAction,
  removeCouponAction,
  updateCartItemAction,
} from "@/server/actions/cart";
import type { CartViewDto } from "@/server/services/cart.service";

interface CartContextValue {
  cart: CartViewDto | null;
  /** تعداد کل اقلام برای نشانگر هدر */
  count: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** خروجی: موفق بود یا نه (پیام خطا را خودش نشان می‌دهد) */
  add: (variantId: string, quantity: number) => Promise<boolean>;
  update: (variantId: string, quantity: number) => Promise<boolean>;
  remove: (variantId: string) => Promise<boolean>;
  /** خطا را برمی‌گرداند تا زیر ورودی نمایش داده شود (بدون toast) */
  applyCoupon: (code: string) => Promise<{ ok: boolean; message?: string }>;
  removeCoupon: () => Promise<boolean>;
  /** جایگزینی نمای سبد با نسخه‌ی تازه‌ی سرور (مثلاً از صفحه‌ی /cart) */
  replace: (cart: CartViewDto) => void;
  /** خواندن دوباره‌ی سبد از سرور (مثلاً پس از ثبت سفارش) */
  refresh: () => Promise<boolean>;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * وضعیت سبد در کلاینت. نمای اولیه با Server Action گرفته می‌شود تا صفحات
 * فروشگاه به کوکی وابسته نشوند و کش ISR آن‌ها حفظ شود.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [cart, setCart] = useState<CartViewDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const apply = useCallback(
    (result: Awaited<ReturnType<typeof getCartAction>>): boolean => {
      if (!result.ok) {
        toast.error(result.message);
        return false;
      }
      setCart(result.cart);
      for (const notice of result.cart.notices) toast.error(notice);
      return true;
    },
    [toast],
  );

  useEffect(() => {
    let cancelled = false;
    getCartAction().then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cart?.itemCount ?? 0,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add: async (variantId, quantity) => {
        const ok = apply(await addToCartAction(variantId, quantity));
        if (ok) {
          toast.success("به سبد خرید اضافه شد");
          setDrawerOpen(true);
        }
        return ok;
      },
      update: async (variantId, quantity) =>
        apply(await updateCartItemAction(variantId, quantity)),
      remove: async (variantId) => apply(await removeCartItemAction(variantId)),
      applyCoupon: async (code) => {
        const result = await applyCouponAction(code);
        if (!result.ok) return { ok: false, message: result.message };
        setCart(result.cart);
        return { ok: true };
      },
      removeCoupon: async () => apply(await removeCouponAction()),
      replace: setCart,
      refresh: async () => apply(await getCartAction()),
    }),
    [apply, cart, drawerOpen, toast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart باید داخل CartProvider استفاده شود");
  return context;
}
