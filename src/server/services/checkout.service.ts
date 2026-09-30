import { collectServiceTerms } from "@/lib/service-order";
import { resolveServiceTerms } from "@/lib/validation/product";
import { findProductsForTerms } from "@/server/repositories/product.repository";
import { listActiveShippingMethods } from "@/server/repositories/shipping.repository";

import { type AddressDto, listAddresses } from "./address.service";
import { type CartOwner, type CartViewDto, getCartView } from "./cart.service";
import { getBusinessSettings } from "./store-content.service";

export interface ShippingOptionDto {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  freeAboveAmount: number | null;
  /** ارسال رایگان از این تعداد کل اقلام سبد به بالا */
  freeAboveQuantity: number | null;
  /** `false` ⇒ تحویل حضوری: آدرس لازم نیست */
  requiresAddress: boolean;
  /** هزینه‌ی پیک درب منزل به پیک پرداخت می‌شود */
  payOnDelivery: boolean;
  /** خالی = همه‌ی مناطق تحت پوشش */
  provinces: string[];
}

export interface CheckoutViewDto {
  cart: CartViewDto;
  addresses: AddressDto[];
  shippingMethods: ShippingOptionDto[];
  /** محل و ساعت تحویل حضوری (`business.*`) */
  pickup: { address: string; hours: string };
  /** فقط وقتی سبد آیتم خدمت دارد: برچسب چک‌باکس و متن کامل شرایط */
  service: { consentLabel: string; terms: string } | null;
}

/** داده‌ی صفحه‌ی تسویه. مبلغ نهایی را `createOrder()` دوباره محاسبه می‌کند. */
export async function getCheckoutView(
  owner: CartOwner & { userId: string },
): Promise<CheckoutViewDto> {
  const [cart, addresses, methods, business] = await Promise.all([
    getCartView(owner),
    listAddresses(owner.userId),
    listActiveShippingMethods(),
    getBusinessSettings(),
  ]);

  let service: CheckoutViewDto["service"] = null;
  if (cart.hasService) {
    const products = await findProductsForTerms(
      cart.lines
        .filter((line) => line.kind === "SERVICE")
        .map((line) => line.productId),
    );
    const terms = collectServiceTerms(
      products.map((product) => ({
        kind: product.kind,
        productName: product.name,
        terms: resolveServiceTerms(product, business.serviceDefaultTerms),
      })),
    );
    if (terms) {
      service = { consentLabel: business.serviceConsentLabel, terms };
    }
  }

  return {
    cart,
    addresses,
    pickup: { address: business.pickupAddress, hours: business.pickupHours },
    service,
    shippingMethods: methods.map((method) => ({
      id: method.id,
      name: method.name,
      description: method.description,
      cost: method.cost,
      freeAboveAmount: method.freeAboveAmount,
      freeAboveQuantity: method.freeAboveQuantity,
      requiresAddress: method.requiresAddress,
      payOnDelivery: method.payOnDelivery,
      provinces: method.provinces,
    })),
  };
}
