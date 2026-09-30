import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutView } from "@/components/shop/checkout/CheckoutView";
import { btnPrimary, panel } from "@/components/shop/styles";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/current-user";
import { cartOwner } from "@/server/cart-cookie";
import { getCheckoutView } from "@/server/services/checkout.service";

export const metadata: Metadata = {
  title: "اطلاعات ارسال",
  robots: { index: false },
};

/** تسویه فقط برای کاربر واردشده (middleware هم محافظت می‌کند) */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const owner = await cartOwner(user.id);
  const view = await getCheckoutView({ ...owner, userId: user.id });
  if (view.cart.lines.length === 0) {
    if (view.cart.notices.length === 0) redirect("/cart");
    // اقلام همین حالا غیرفعال و حذف شدند؛ پیامشان نباید با redirect گم شود
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-5 pt-8">
        <div
          role="alert"
          className={cn(
            panel,
            "flex flex-col items-center gap-4 p-8 text-center",
          )}
        >
          {view.cart.notices.map((notice) => (
            <p key={notice} className="text-danger text-sm leading-7">
              {notice}
            </p>
          ))}
          <p className="text-muted text-sm">سبد خرید شما اکنون خالی است.</p>
          <Link href="/products" className={btnPrimary}>
            مشاهده محصولات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CheckoutView
      initial={view}
      defaults={{
        receiverName: user.fullName ?? "",
        receiverPhone: user.phone,
      }}
    />
  );
}
