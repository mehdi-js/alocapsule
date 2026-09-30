import { listActiveShippingMethods } from "@/server/repositories/shipping.repository";

import { type AddressDto, listAddresses } from "./address.service";
import { type CartOwner, type CartViewDto, getCartView } from "./cart.service";

export interface ShippingOptionDto {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  freeAboveAmount: number | null;
  /** هزینه‌ی پیک درب منزل به پیک پرداخت می‌شود */
  payOnDelivery: boolean;
  /** خالی = همه‌ی مناطق تحت پوشش */
  provinces: string[];
}

export interface CheckoutViewDto {
  cart: CartViewDto;
  addresses: AddressDto[];
  shippingMethods: ShippingOptionDto[];
}

/** داده‌ی صفحه‌ی تسویه. مبلغ نهایی را `createOrder()` دوباره محاسبه می‌کند. */
export async function getCheckoutView(
  owner: CartOwner & { userId: string },
): Promise<CheckoutViewDto> {
  const [cart, addresses, methods] = await Promise.all([
    getCartView(owner),
    listAddresses(owner.userId),
    listActiveShippingMethods(),
  ]);
  return {
    cart,
    addresses,
    shippingMethods: methods.map((method) => ({
      id: method.id,
      name: method.name,
      description: method.description,
      cost: method.cost,
      freeAboveAmount: method.freeAboveAmount,
      payOnDelivery: method.payOnDelivery,
      provinces: method.provinces,
    })),
  };
}
