import {
  ORDER_NUMBER_PREFIX_KEY,
  parseOrderNumberPrefix,
} from "@/lib/order-number";
import { getSetting } from "@/server/repositories/setting.repository";

/** پیشوند شماره‌ی سفارش از `Setting` (`order.numberPrefix`)؛ نبود/نامعتبر ⇒ پیش‌فرض */
export async function getOrderNumberPrefix(): Promise<string> {
  return parseOrderNumberPrefix(await getSetting(ORDER_NUMBER_PREFIX_KEY));
}
